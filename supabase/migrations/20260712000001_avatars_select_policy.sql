-- Storage's remove()/upsert() endpoints do a RETURNING-style SELECT under RLS
-- to report which objects were affected (deleted, or overwritten on conflict).
-- Without a SELECT policy, that lookup is silently filtered to zero rows:
-- remove() reports success with an empty result and nothing is actually
-- deleted. Public reads already bypass RLS via the bucket's public flag, so
-- this only affects the owner's own authenticated management calls.

create policy "avatars_select_own_folder" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
