-- T-07 (US-39): lets the Verifier's review queue actually display each
-- cover's image. The cover-images bucket (T-05) has zero anon/authenticated
-- policies at all — only service_role can touch it — which was sufficient
-- for server-side upload during import but leaves no path for a Verifier's
-- own authenticated client to read an image directly.
--
-- Mirrors covers' own RLS shape exactly (20260804151630_rls_policies_covers.sql):
-- Admin gets any status' image, Verifier gets draft/flagged only. Collector
-- still gets nothing here — public read for verified covers' images is a
-- distinct, still-open design question (Threat-Model.md), needed once the
-- consumer app displays them (T-08/T-09), not before.
--
-- Storage RLS is already enabled by Supabase on storage.objects by default
-- (a system-managed table, unlike ADR-007's "new table" case) — only
-- policies are needed here, no ALTER TABLE ... ENABLE ROW LEVEL SECURITY.
create policy "Admin can read any cover image"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cover-images'
  and public.current_profile_role() = 'admin'
);

create policy "Verifier can read draft/flagged cover images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cover-images'
  and public.current_profile_role() = 'verifier'
  and exists (
    select 1 from public.covers
    where covers.image_file = storage.objects.name
      and covers.verification_status in ('draft', 'flagged')
  )
);
