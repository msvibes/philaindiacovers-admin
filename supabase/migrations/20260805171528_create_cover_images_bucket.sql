-- T-05: Storage bucket for cover images. Private, no anon/authenticated
-- policies on storage.objects — only service_role can touch it (via
-- BYPASSRLS, same mechanism that bypasses table RLS), which is exactly
-- what T-05's server-side confirm-import route needs and nothing more.
--
-- Deliberately does NOT implement the full locked design from
-- API-Integration-Contracts.md §4 ("public read access for images
-- belonging to verified covers only") — that requires its own storage.objects
-- RLS policy joining against covers.verification_status, a genuine design
-- question (and a distinct permission system from Postgres table RLS, per
-- docs/Threat-Model.md's Storage scope note) that isn't needed until the
-- consumer app actually has to display images to collectors (T-08/T-09
-- territory). Tracked there, not solved here.
insert into storage.buckets (id, name, public)
values ('cover-images', 'cover-images', false)
on conflict (id) do nothing;
