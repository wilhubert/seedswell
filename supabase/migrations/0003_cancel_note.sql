-- The called-off honesty note, part of the decided data model:
-- "Called off = cancelled_at set, with a public honesty note."
alter table public.projects add column cancel_note text;

-- Public by design: the note renders on the seed's page.
-- Explicit grant required because 0002 restricted projects to a column list.
grant select (cancel_note) on public.projects to anon, authenticated;

notify pgrst, 'reload schema';
