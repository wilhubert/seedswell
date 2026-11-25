-- Founder updates became retractable: the owner can delete their own
-- posts from the seed page. Updates stay public record for everyone
-- else — the existing insert policy keeps non-owners from adding.
create policy "owners delete updates" on public.seed_posts
  for delete to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = seed_posts.project_id
        and p.user_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
