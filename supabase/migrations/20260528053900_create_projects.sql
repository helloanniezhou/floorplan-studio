-- Cloud project storage for Floor Plan Studio

create table if not exists public.projects (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  updated_at timestamptz not null default now(),
  plan_json jsonb not null
);

create index if not exists projects_user_id_updated_at_idx
  on public.projects (user_id, updated_at desc);

alter table public.projects enable row level security;

drop policy if exists "users can read own projects" on public.projects;
create policy "users can read own projects"
  on public.projects for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users can insert own projects" on public.projects;
create policy "users can insert own projects"
  on public.projects for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "users can update own projects" on public.projects;
create policy "users can update own projects"
  on public.projects for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "users can delete own projects" on public.projects;
create policy "users can delete own projects"
  on public.projects for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.projects to authenticated;

notify pgrst, 'reload schema';
