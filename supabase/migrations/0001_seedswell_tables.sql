-- Seedswell schema: profiles, projects, commits.
-- RLS is enabled on every table at creation, deny-by-default, then explicit policies.
-- The anon key is public (ships in the browser); these policies are the whole boundary.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  tagline text,
  logo_url text,
  planted_at timestamptz not null default now(),
  target_days int not null,
  shipped_at timestamptz,
  cancelled_at timestamptz,
  ship_days int,
  webhook_secret text not null,
  connected_at timestamptz,
  push_count int not null default 0
);

create table public.commits (
  sha text not null,
  project_id uuid not null references public.projects (id) on delete cascade,
  message text not null,
  author text,
  url text,
  committed_at timestamptz not null,
  pushed_at timestamptz not null default now(),
  primary key (project_id, sha)
);

create index commits_by_project on public.commits (project_id, pushed_at desc);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.commits enable row level security;

-- Public read: the board is public.
create policy "profiles are public" on public.profiles for select using (true);
create policy "projects are public" on public.projects for select using (true);
create policy "commits are public" on public.commits for select using (true);

-- Own-row writes. Deny-by-default means email/password etc. remain inaccessible.
create policy "users seed their own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "users update their own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "users create their own projects" on public.projects
  for insert to authenticated with check (auth.uid() = user_id);
create policy "users update their own projects" on public.projects
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- commits: no write policies for anon/authenticated. Inserts happen only via the
-- webhook route, which uses the service role key and bypasses RLS.
