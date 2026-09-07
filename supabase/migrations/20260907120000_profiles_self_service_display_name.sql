-- KAN-41 (App repo, US-30/FR-33): lets a Collector view and set their own
-- display_name -- the column has existed since profiles was created
-- (20260730162059_create_profiles.sql) but nothing has ever granted any
-- client-side access to it. Confirmed directly, not assumed: profiles has
-- zero RLS policies today -- current_profile_role() is SECURITY DEFINER
-- specifically because an authenticated caller has no direct read access
-- to this table at all (see that function's own comment,
-- 20260804151630_rls_policies_covers.sql).
--
-- RLS policy + a column-scoped grant, not a SECURITY DEFINER function pair
-- like verify_cover()/current_profile_role() -- deliberately, per the
-- 2026-09-07 decision on KAN-41. This is a same-row, single-column,
-- non-atomic read/write with no cross-row or multi-step logic, the shape
-- RLS already fits directly. SECURITY DEFINER earns its complexity when a
-- function needs to act with elevated privilege beyond what the caller's
-- own row should allow (verify_cover() writes covers, not profiles;
-- current_profile_role() needs to work for a caller with zero profiles
-- grant at all) -- neither reason applies here.
--
-- role stays completely unreachable by a Collector even on their own row:
-- the RLS policy alone would still let an UPDATE reach the row, so the
-- column-scoped GRANT is the actual enforcement, not the policy.
-- Column-level privileges and RLS combine with AND semantics in Postgres
-- (both must permit an operation), so this is real, not just each layer
-- individually being permissive.
create policy "Collectors can view their own profile"
on profiles
for select
to authenticated
using (id = auth.uid());

create policy "Collectors can update their own profile"
on profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

grant select (id, role, display_name, created_at) on profiles to authenticated;
grant update (display_name) on profiles to authenticated;
