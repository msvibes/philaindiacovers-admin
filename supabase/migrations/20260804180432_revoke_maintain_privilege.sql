-- Minor cleanup addendum to 20260804180223_revoke_rls_bypassing_privileges.sql.
-- MAINTAIN (VACUUM/ANALYZE/REINDEX/CLUSTER/REFRESH MATERIALIZED VIEW) was
-- left granted to anon/authenticated by the same pre-existing baseline —
-- not an RLS-bypass risk like TRUNCATE was, but no ordinary app user
-- (logged in or not) has any legitimate reason to run table maintenance
-- operations. Removing it for a fully intentional, least-privilege
-- baseline rather than leaving an unused grant in place.
revoke maintain on covers, profiles, postal_circles from anon, authenticated;

alter default privileges in schema public
  revoke maintain on tables from anon, authenticated;
