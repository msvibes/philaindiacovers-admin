-- T-04 (US-35): RLS policies for covers.
-- Admin: full read/write. Verifier: read-only on draft/flagged, NO write
-- path at all — per ADR-005, verification actions go exclusively through
-- the future verify_cover() SECURITY DEFINER function (T-06), never
-- direct table writes. Collector: read-only on verified.

-- Per T-03's finding: this project's "Automatically expose new tables"
-- setting is unchecked, which suppresses default grants for anon AND
-- authenticated (not just service_role, which was already fixed
-- separately). RLS alone only filters rows on top of an existing GRANT —
-- without the base GRANT, every query fails outright with a permission
-- error instead of being properly row-filtered. Deliberately scoped
-- per-table here (not a blanket ALTER DEFAULT PRIVILEGES like the
-- service_role fix), matching Supabase's own stated reasoning for the new
-- default-off behavior: explicit per-table grants for anon/authenticated
-- are a deliberate, reviewable security feature, not something to route
-- around uniformly. Future tables get their own explicit grant+RLS
-- treatment when their own task picks them up.
grant select, insert, update, delete on covers to authenticated;
-- Deliberately no anon grant: covers has no anon-facing use case in the
-- locked design (API-Integration-Contracts.md's RLS Policy Summary has no
-- anon/public row for covers, unlike postal_circles) — anon should be
-- refused outright by PostgREST, not silently filtered to zero rows.

alter table covers enable row level security;

-- Helper: the caller's own role, without granting any authenticated user
-- direct read access to the profiles table itself. SECURITY DEFINER so it
-- can read profiles regardless of anon/authenticated grants there — the
-- same narrow-capability pattern as ADR-005's verify_cover(). Always keyed
-- off auth.uid(), never a caller-supplied id, so it can only ever return
-- the caller's own role.
create or replace function current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create policy "Admin full access to covers"
on covers
for all
to authenticated
using (current_profile_role() = 'admin')
with check (current_profile_role() = 'admin');

create policy "Verifier can view draft and flagged covers"
on covers
for select
to authenticated
using (
  current_profile_role() = 'verifier'
  and verification_status in ('draft', 'flagged')
);

create policy "Collector can view verified covers"
on covers
for select
to authenticated
using (
  current_profile_role() = 'collector'
  and verification_status = 'verified'
);
