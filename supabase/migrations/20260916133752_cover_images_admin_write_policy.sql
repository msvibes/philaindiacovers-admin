-- Launch-scale bulk import + bulk-update (KAN catalogue-management work):
-- both need the BROWSER to upload/replace images directly to Storage,
-- bypassing the Next.js API route entirely — confirmed against Vercel's
-- own current docs that Function request bodies are capped at 4.5MB on
-- every plan, and confirmed that's Vercel's own recommended fix for
-- exactly this shape of problem (direct-to-storage client upload, not a
-- server-side proxy). Today only service_role can write to the
-- cover-images bucket (20260805171528_create_cover_images_bucket.sql) —
-- sufficient for confirm-import's existing INSERT-only image uploads, but
-- blocks any client-side upload entirely.
--
-- Mirrors the existing read-policy pattern exactly
-- (20260808153406_cover_images_review_read_policies.sql): Admin-only,
-- keyed on current_profile_role(). INSERT covers both fresh uploads
-- (bulk import) and new-file-then-cleanup replacement (bulk update).
-- DELETE is needed for bulk-update's old-image cleanup after a
-- replacement succeeds. No UPDATE policy — a replacement is always
-- upload-new-then-delete-old, never an in-place object overwrite.
create policy "Admin can upload cover images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'cover-images'
  and public.current_profile_role() = 'admin'
);

create policy "Admin can delete cover images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'cover-images'
  and public.current_profile_role() = 'admin'
);
