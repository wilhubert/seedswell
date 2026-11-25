-- Founder updates: the owner's own posts to watchers, shown as a
-- numbered list on the seed page. Insert-only — updates are public
-- record like the build log; there are no update or delete policies.
create table public.seed_posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  body text not null check (char_length(btrim(body)) > 0 and char_length(body) <= 500),
  created_at timestamptz not null default now()
);

alter table public.seed_posts enable row level security;

-- Posts render on a public page.
create policy "seed posts are public" on public.seed_posts
  for select using (true);

-- Only the seed's owner posts, and only into their own seed. Projects
-- are public-read so the ownership subquery resolves for any caller;
-- the policy still rejects everyone but the owner.
create policy "owners post updates" on public.seed_posts
  for insert to authenticated with check (
    exists (
      select 1 from public.projects p
      where p.id = seed_posts.project_id
        and p.user_id = auth.uid()
    )
  );

create index seed_posts_by_project on public.seed_posts (project_id, created_at);

notify pgrst, 'reload schema';
