-- Switches the `authenticated` grant approach from per-table (T-04's
-- original design) to a blanket ALTER DEFAULT PRIVILEGES, matching
-- service_role's fix (20260802160741_...sql) exactly. Confirmed safe per
-- ADR-007: "Enable automatic RLS" is checked project-wide, so every new
-- table gets RLS default-deny the moment it's created, regardless of
-- creation method — verified empirically that `profiles` and
-- `postal_circles` both already had RLS enabled despite no migration ever
-- asking for it. A grant here never bypasses RLS, so collection_items,
-- wishlist_items, verification_audit_log, and anything created later will
-- be both grant-covered and RLS-locked-down the moment they exist, not
-- wide open until their own task remembers to add a grant.
--
-- Does not retroactively grant anything on covers — default privileges
-- only apply to objects created AFTER this statement runs. covers keeps
-- its own explicit grant from 20260804151630_rls_policies_covers.sql.
--
-- Deliberately narrower than service_role's "all privileges": only the
-- CRUD operations an ordinary authenticated end user could ever need.
-- Explicitly NOT truncate/references/trigger — TRUNCATE in particular
-- bypasses RLS entirely in Postgres (it doesn't evaluate row policies at
-- all), so granting it to authenticated would let any logged-in user wipe
-- an entire table regardless of RLS. service_role is the trusted
-- server-side role where "all privileges" is appropriate; authenticated
-- is real end users, gated only by RLS, so it gets exactly what RLS is
-- actually designed to filter.
grant usage on schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
