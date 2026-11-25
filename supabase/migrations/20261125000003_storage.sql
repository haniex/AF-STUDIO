-- =====================================================================
-- AF STUDIO 2.0 — Storage buckets & policies
-- project-files  : PRIVATE. Path = <owner_uid>/<project_id|general|drafts|moodboards>/<uuid>-<name>
-- portfolio-media: PRIVATE. Read for signed-in users, write for admins (portfolio, before/after, 3D models)
-- avatars        : PRIVATE. Path = <uid>/avatar-*.ext ; read for signed-in users
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('project-files', 'project-files', false, 52428800, array[
     'image/jpeg','image/png','image/webp','image/gif','image/avif',
     'application/pdf','application/zip','application/x-zip-compressed',
     'text/plain','application/msword',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'model/gltf-binary','model/gltf+json','application/octet-stream',
     'video/mp4','video/quicktime']),
  ('portfolio-media', 'portfolio-media', false, 104857600, array[
     'image/jpeg','image/png','image/webp','image/avif',
     'model/gltf-binary','model/gltf+json','application/octet-stream','video/mp4']),
  ('avatars', 'avatars', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "pf_read_own" on storage.objects;
drop policy if exists "pf_insert_own" on storage.objects;
drop policy if exists "pf_delete_own" on storage.objects;
drop policy if exists "pf_admin_all" on storage.objects;
drop policy if exists "pm_read" on storage.objects;
drop policy if exists "pm_admin" on storage.objects;
drop policy if exists "av_read" on storage.objects;
drop policy if exists "av_write_own" on storage.objects;
drop policy if exists "av_update_own" on storage.objects;
drop policy if exists "av_delete_own" on storage.objects;

-- project-files ---------------------------------------------------------
create policy "pf_read_own" on storage.objects for select to authenticated
  using (bucket_id = 'project-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "pf_insert_own" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      (storage.foldername(name))[2] in ('general','drafts','moodboards')
      or exists (select 1 from public.projects p
                 where p.id::text = (storage.foldername(name))[2] and p.client_id = auth.uid())
    )
  );

-- Clients may delete only objects THEY uploaded (owner = uploader). Admin-uploaded
-- renders/finals in the client's folder can therefore never be removed or replaced
-- by the client. No UPDATE policy for clients → no overwrite (upsert) possible.
create policy "pf_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'project-files' and owner_id = auth.uid()::text
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy "pf_admin_all" on storage.objects for all to authenticated
  using (bucket_id in ('project-files','portfolio-media','avatars') and public.is_admin())
  with check (bucket_id in ('project-files','portfolio-media','avatars') and public.is_admin());

-- portfolio-media -------------------------------------------------------
create policy "pm_read" on storage.objects for select to authenticated
  using (bucket_id = 'portfolio-media');

-- avatars ---------------------------------------------------------------
create policy "av_read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars');
create policy "av_write_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "av_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and owner_id = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "av_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and owner_id = auth.uid()::text);
