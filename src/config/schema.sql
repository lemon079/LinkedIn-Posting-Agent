-- ==============================================================================
-- Praxis Database Schema
-- Multi-Tenant PostgreSQL Schema for Supabase
-- ==============================================================================

-- 1. Table: user_settings
-- Stores encrypted API credentials, LLM model preferences, and LinkedIn OAuth tokens.
create table if not exists public.user_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  llm_provider text default 'gemini',
  encrypted_api_key text,
  llm_model text,
  ollama_base_url text default 'http://localhost:11434',
  encrypted_tavily_key text,
  encrypted_linkedin_token text,
  encrypted_linkedin_refresh_token text,
  linkedin_token_expires_at bigint,
  linkedin_urn text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_settings' and policyname = 'Users can modify their own settings'
  ) then
    create policy "Users can modify their own settings"
      on public.user_settings
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;


-- 2. Table: user_post_history
-- Records published posts and opening hooks for dynamic pattern avoidance across runs.
create table if not exists public.user_post_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  hook text not null,
  topic text,
  domain text,
  critique_score numeric,
  published_at timestamp with time zone,
  linkedin_post_urn text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_post_history enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_post_history' and policyname = 'Users can modify their own post history'
  ) then
    create policy "Users can modify their own post history"
      on public.user_post_history
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_user_post_history_user_domain_created
  on public.user_post_history (user_id, domain, created_at desc);


-- 3. Table: agent_checkpoints
-- Persists LangGraph agent state graph threads and checkpoints directly in Postgres.
create table if not exists public.agent_checkpoints (
  thread_id text not null,
  checkpoint_id text not null,
  parent_id text,
  checkpoint_json jsonb not null,
  metadata_json jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (thread_id, checkpoint_id)
);

alter table public.agent_checkpoints enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'agent_checkpoints' and policyname = 'Allow service and authenticated access to checkpoints'
  ) then
    create policy "Allow service and authenticated access to checkpoints"
      on public.agent_checkpoints
      for all
      using (true)
      with check (true);
  end if;
end $$;

create index if not exists idx_agent_checkpoints_thread_created
  on public.agent_checkpoints (thread_id, created_at desc);


-- 4. Table: agent_checkpoint_writes
-- Persists intermediate task channel writes for LangGraph checkpointer.
create table if not exists public.agent_checkpoint_writes (
  thread_id text not null,
  checkpoint_id text not null,
  task_id text not null,
  idx integer not null,
  channel text not null,
  type text,
  value_json jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (thread_id, checkpoint_id, task_id, idx)
);

alter table public.agent_checkpoint_writes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'agent_checkpoint_writes' and policyname = 'Allow service and authenticated access to checkpoint writes'
  ) then
    create policy "Allow service and authenticated access to checkpoint writes"
      on public.agent_checkpoint_writes
      for all
      using (true)
      with check (true);
  end if;
end $$;


-- 5. Storage: temp-uploads Bucket
-- Public bucket for temporary image and document attachment uploads.
insert into storage.buckets (id, name, public)
values ('temp-uploads', 'temp-uploads', true)
on conflict (id) do update set public = true;
