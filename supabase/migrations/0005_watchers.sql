-- Watch: a logged-in user follows a seed and gets the ship event on the
-- in-app watchlist (/watching). Ship events only — push tracking stays parked.
create table public.watchers (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table public.watchers enable row level security;

-- Watch rows are public (counts are board content); writes are own-row only.
create policy "watchers are public" on public.watchers
  for select using (true);
create policy "users watch" on public.watchers
  for insert to authenticated with check (auth.uid() = user_id);
create policy "users unwatch" on public.watchers
  for delete to authenticated using (auth.uid() = user_id);

create index watchers_by_user on public.watchers (user_id);

notify pgrst, 'reload schema';
