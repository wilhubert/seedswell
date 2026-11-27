-- Avatar uploads for email-registered users (pulled into scope by explicit
-- human decision). GitHub users keep their synced GitHub avatar; email users
-- can upload a photo into Supabase Storage, and the profile falls back to an
-- initial circle when no avatar exists.
--
-- One public bucket, deny-by-default like every table: anyone can read
-- avatar images (profiles are public board content), and a signed-in user
-- can only write objects inside a folder named with their own auth.uid().

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read: avatar images render on the public board and profile pages.
create policy "Avatar images are public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Owner-only writes: the first folder segment of the object path is the
-- uploader's auth uid, so nobody can plant or replace another user's photo.
create policy "Users upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users replace their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
