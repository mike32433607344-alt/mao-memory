-- 牟之记忆法 cloud sync schema
create table if not exists public.memory_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.memory_states enable row level security;
drop policy if exists "users read own state" on public.memory_states;
create policy "users read own state" on public.memory_states for select using (auth.uid() = user_id);
drop policy if exists "users insert own state" on public.memory_states;
create policy "users insert own state" on public.memory_states for insert with check (auth.uid() = user_id);
drop policy if exists "users update own state" on public.memory_states;
create policy "users update own state" on public.memory_states for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
