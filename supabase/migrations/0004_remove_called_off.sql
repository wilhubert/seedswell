-- Removes the called-off feature: manual cancel with a public honesty note.
-- The board's only conclusion left is shipping. Idle dormancy (a seed going
-- quiet after a period without pushes, until taken up again) is parked in
-- IDEAS.md and would be a different mechanism, not these columns.
alter table public.projects
  drop column if exists cancel_note,
  drop column if exists cancelled_at;

-- Dropping a column also drops its column grants, so 0002's restricted select
-- list needs no repair; the API simply stops seeing the columns.
notify pgrst, 'reload schema';
