create extension if not exists "pgcrypto";

create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  display_name text not null,
  storage_used_bytes bigint not null default 0,
  storage_quota_bytes bigint not null default 5368709120,
  created_at timestamptz not null default now()
);

create table folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  parent_id uuid references folders(id) on delete cascade,
  name text not null,
  is_trashed boolean not null default false,
  trashed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  folder_id uuid references folders(id) on delete set null,
  name text not null,
  storage_key text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  status text not null default 'pending',
  current_version_id uuid,
  is_trashed boolean not null default false,
  trashed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table file_versions (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references files(id) on delete cascade,
  storage_key text not null,
  size_bytes bigint not null default 0,
  mime_type text,
  created_at timestamptz not null default now()
);

create table shares (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references files(id) on delete cascade,
  folder_id uuid references folders(id) on delete cascade,
  grantee_user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('viewer','editor')),
  created_by uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table link_shares (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references files(id) on delete cascade,
  folder_id uuid references folders(id) on delete cascade,
  token text unique not null,
  role text not null check (role in ('viewer','editor')),
  password_hash text,
  expires_at timestamptz,
  created_by uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table stars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  file_id uuid references files(id) on delete cascade,
  folder_id uuid references folders(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references users(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index idx_files_owner_folder on files(owner_id, folder_id, is_trashed);
create index idx_folders_owner_parent on folders(owner_id, parent_id, is_trashed);
create index idx_link_shares_token on link_shares(token);
create index idx_shares_grantee on shares(grantee_user_id);
