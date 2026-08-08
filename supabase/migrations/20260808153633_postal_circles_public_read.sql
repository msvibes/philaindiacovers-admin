-- Real infra gap found while building T-07's review-queue query (its
-- postal_circles(name) join failed with "permission denied for table
-- postal_circles" against a real authenticated session, not RLS-filtered
-- to zero rows — a grant-level failure, same symptom class as T-03/T-04's
-- prior missing-grant findings).
--
-- postal_circles predates 20260804175714_default_privileges_authenticated.sql
-- (created 2026-07-30, that migration is 2026-08-04) — like covers, it
-- needed its own explicit grant, since default privileges only apply to
-- objects created after that statement ran. Unlike covers, nobody ever
-- added one. It also has RLS enabled by default (ADR-007, confirmed
-- empirically in that ADR's own addendum) with zero policies — deny-all —
-- so even with a grant, no role could read a single row until a policy
-- exists either.
--
-- API-Integration-Contracts.md's RLS Policy Summary already documents
-- postal_circles as "Public read" for every role — this migration is what
-- actually implements that stated design, not a new decision. anon is
-- included deliberately (unlike covers, which has no anon-facing use
-- case): this is static reference data (23 circle names), safe to expose
-- to a completely unauthenticated caller.
grant select on postal_circles to anon, authenticated;

create policy "Public read access to postal_circles"
on postal_circles
for select
to anon, authenticated
using (true);
