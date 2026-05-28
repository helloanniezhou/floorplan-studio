create table if not exists public.projects (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  updated_at timestamptz not null default now(),
  plan_json jsonb not null
);

alter table public.projects enable row level security;

create policy "users can read own projects"
on public.projects for select
using (auth.uid() = user_id);

create policy "users can insert own projects"
on public.projects for insert
with check (auth.uid() = user_id);

create policy "users can update own projects"
on public.projects for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can delete own projects"
on public.projects for delete
using (auth.uid() = user_id);
