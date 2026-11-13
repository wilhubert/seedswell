-- webhook_secret must never be readable through the public API.
-- RLS controls rows; column grants control which columns the API can even see.

revoke select on public.projects from anon, authenticated;
grant select (id, user_id, name, tagline, logo_url, planted_at, target_days,
             shipped_at, cancelled_at, ship_days, connected_at, push_count)
  on public.projects to anon, authenticated;

-- Owners can still read their own webhook secret, through this function only.
create or replace function public.get_own_webhook_secret(p_project_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select webhook_secret from public.projects
  where id = p_project_id and user_id = auth.uid();
$$;

revoke all on function public.get_own_webhook_secret(uuid) from public, anon;
grant execute on function public.get_own_webhook_secret(uuid) to authenticated;

notify pgrst, 'reload schema';
