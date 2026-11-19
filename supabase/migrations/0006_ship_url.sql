-- Ship receipts can point at the live site; the board's "built" pill links
-- there. Reads are public via the column grant (0002 revoked table select),
-- writes go through the existing owner-only update policy.

alter table public.projects add column ship_url text;

grant select (ship_url) on public.projects to anon, authenticated;
grant update (ship_url) on public.projects to authenticated;

notify pgrst, 'reload schema';
