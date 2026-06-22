-- Create user_settings table mapping Supabase Auth users to app configurations
create table if not exists public.user_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  llm_provider text default 'gemini',
  encrypted_api_key text,
  llm_model text,
  ollama_base_url text default 'http://localhost:11434',
  encrypted_tavily_key text,
  encrypted_linkedin_token text,
  linkedin_urn text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) on public.user_settings
alter table public.user_settings enable row level security;

-- Create policy allowing authenticated users to CRUD only their own rows
create policy "Users can modify their own settings"
  on public.user_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
