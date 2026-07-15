-- Food Log — initial schema (Phase 1 of docs/IOS_LAUNCH_PLAN.md)
-- Apply with: supabase db push   (after `supabase link`)
-- or paste into the Supabase dashboard SQL editor.

-- profiles: one row per auth user
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  daily_goal int not null default 2000,
  created_at timestamptz not null default now()
);

-- food_logs: the core table (mirrors the old sheet columns)
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food text not null,
  calories int,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  sugars_g numeric,
  confidence int,           -- 0-100 from the AI
  source text not null default 'app',   -- 'app' | 'siri' | 'import'
  logged_at timestamptz not null default now()
);
create index on public.food_logs (user_id, logged_at desc);

-- shortcut_tokens: long-lived tokens for the Siri Shortcut (Shortcuts can't refresh JWTs)
create table public.shortcut_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,      -- sha256 hex of the raw token; raw shown to user once
  label text default 'Siri Shortcut',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- RLS: per-user isolation. Non-negotiable.
alter table public.profiles enable row level security;
alter table public.food_logs enable row level security;
alter table public.shortcut_tokens enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own logs" on public.food_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tokens" on public.shortcut_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Auto-create a profile row for every new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
