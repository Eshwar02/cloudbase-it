-- AI features: pgvector-backed semantic search over files.
-- Safe to run more than once.

create extension if not exists vector;

alter table files add column if not exists embedding vector(1024);
alter table files add column if not exists ai_summary text;

-- Cosine-distance index for approximate nearest-neighbour ranking.
create index if not exists files_embedding_idx
  on files using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
