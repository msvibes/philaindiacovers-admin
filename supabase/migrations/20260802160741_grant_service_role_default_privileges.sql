-- Restores privileges that should exist on any standard Supabase project
-- by default but were apparently missing on this one: service_role has
-- BYPASSRLS, but that only bypasses row-level security policies — it still
-- needs the base SQL-level GRANT to touch a table at all. Confirmed via
-- direct REST calls that service_role got "permission denied" on both
-- covers and postal_circles (42501), which blocked T-03's server-side
-- duplicate-check route. This does NOT touch anon/authenticated grants —
-- those are T-04's explicit RLS-policy work, not this migration's job.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- So this doesn't recur for tables created by future migrations.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
