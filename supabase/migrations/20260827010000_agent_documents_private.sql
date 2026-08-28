-- Identity documents do not belong in the public bucket.
--
-- The first pass uploaded licences and ID proofs to catalog-images, which is
-- public: anyone with the URL could open someone's driving licence, and those
-- URLs travel through browser history, logs and anywhere the page is shared.
-- An unguessable link is not access control.
--
-- Done now because the columns are still empty. Once real documents are in a
-- public bucket, moving them does not un-share what was already exposed.
insert into storage.buckets (id, name, public)
values ('agent-documents', 'agent-documents', false)
on conflict (id) do update set public = false;

-- Only admins touch this bucket. Agents do not upload their own documents —
-- the office sees the original and photographs it — and customers have no
-- reason to know it exists.
drop policy if exists "Admins read agent documents" on storage.objects;
create policy "Admins read agent documents"
  on storage.objects for select
  using (bucket_id = 'agent-documents' and is_admin(auth.uid()));

drop policy if exists "Admins write agent documents" on storage.objects;
create policy "Admins write agent documents"
  on storage.objects for insert
  with check (bucket_id = 'agent-documents' and is_admin(auth.uid()));

drop policy if exists "Admins remove agent documents" on storage.objects;
create policy "Admins remove agent documents"
  on storage.objects for delete
  using (bucket_id = 'agent-documents' and is_admin(auth.uid()));

-- These hold a path inside a private bucket, not a public URL. Renamed so the
-- difference is visible at the call site rather than assumed.
alter table delivery_agents rename column id_proof_url to id_proof_path;
alter table delivery_agents rename column licence_url to licence_path;
