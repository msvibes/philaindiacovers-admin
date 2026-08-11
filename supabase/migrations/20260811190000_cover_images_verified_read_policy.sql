-- T-08 (App repo, consumer catalogue list view): storage.objects read
-- policy for 'cover-images' letting a Collector download a verified
-- cover's image. Nothing has granted this until now — T-05 built the
-- bucket service_role-only; T-07 added Admin/Verifier read policies but
-- explicitly left Collector at zero access, tracked as an open gap for
-- T-08/T-09 (docs/Threat-Model.md's Storage scope note).
--
-- Scoped to `authenticated` only, NOT `anon`. API-Integration-Contracts.md
-- §4 previously described this as "public read access... mirrors the same
-- RLS logic as the covers table itself" — that wording was stale and has
-- been corrected at the source as part of this task: `covers` itself has
-- zero anon grant, specifically because this app has a locked non-goal of
-- no anonymous browsing anywhere. The only legitimate caller for a cover
-- image is an already-authenticated Collector, so this policy matches
-- `covers`' own scoping exactly, not just its verification_status filter.
create policy "Authenticated users can view verified covers' images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cover-images'
  and exists (
    select 1
    from covers
    where covers.image_file = storage.objects.name
      and covers.verification_status = 'verified'
  )
);
