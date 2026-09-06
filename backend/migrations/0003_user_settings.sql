-- Per-user preferences (appearance, density, default view, deletion
-- confirmation, in-app notifications). Stored as JSON so new keys can be
-- added without further migrations. Safe to run more than once.

alter table users add column if not exists settings jsonb not null default '{}'::jsonb;
