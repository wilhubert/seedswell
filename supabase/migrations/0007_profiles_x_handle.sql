-- Follow on X: the X handle is profile content, editable by its owner on
-- their own profile page (like bio). Reads ride the public profiles select
-- policy, writes the existing own-row update policy.

alter table public.profiles add column x_handle text;

notify pgrst, 'reload schema';
