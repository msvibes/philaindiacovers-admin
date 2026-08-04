-- SECURITY FIX. Found while verifying ADR-007's premise (confirming that
-- "Enable automatic RLS" makes a blanket ALTER DEFAULT PRIVILEGES safe for
-- authenticated) — not what was being investigated, but too serious to
-- leave for later once found.
--
-- `anon` currently has TRUNCATE, REFERENCES, and TRIGGER granted on
-- covers, profiles, AND postal_circles — confirmed live via
-- information_schema.role_table_grants and pg_default_acl. TRUNCATE does
-- not evaluate Row-Level Security policies AT ALL in Postgres — RLS is
-- irrelevant to it. This means anyone holding the public anon key could
-- truncate (empty) any of these tables right now, regardless of any RLS
-- policy: a live, currently-exploitable Tampering/DoS risk, not
-- hypothetical. `authenticated` has the same three privileges on all
-- three tables too — nearly as dangerous, since it would let any logged-in
-- user (not just Admin) truncate covers.
--
-- Root cause, confirmed via pg_default_acl: this project's baseline
-- default ACL for tables created by `postgres` (what migrations run as)
-- already included `anon=Dxtm` and `authenticated=Dxtm` before any of
-- T-01/T-03/T-04's work — independent of anything any migration asked
-- for. "Automatically expose new tables" being off appears to only
-- suppress the CRUD privileges (a/r/w/d), not these schema-administrative
-- ones (D=TRUNCATE, x=REFERENCES, t=TRIGGER, m=MAINTAIN).
--
-- Fix: revoke the dangerous privileges from both roles on the tables that
-- exist today, and revoke them from the default ACL so future tables
-- don't inherit this baseline either. Does not touch SELECT/INSERT/
-- UPDATE/DELETE — those remain exactly as each table's own task
-- deliberately set them up (or deliberately didn't, for anon).
revoke truncate, references, trigger on covers, profiles, postal_circles from anon, authenticated;

alter default privileges in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;
