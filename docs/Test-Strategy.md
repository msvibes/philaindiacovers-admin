# PhilaIndiaCovers — Test Strategy

Fills the literal "[Fill in once a test runner is chosen]" placeholder that's been sitting in both repos' `CLAUDE.md` since initial setup.

## Testing Pyramid — What Gets Tested at Which Layer

| Layer | Tool | What it covers | Runs |
|---|---|---|---|
| **Unit** | Vitest (both repos — modern, fast, works identically for the Next.js admin app and Electron's renderer code) | Pure logic: date-format parsing, duplicate-detection matching, priority-sort ordering, spend-calculation splitting (Purchased vs. non-Purchased) | On every commit, locally and in CI |
| **Integration** | Vitest + a real (dev-project) Supabase connection | RLS policies actually behaving as designed per role; `verify_cover()`'s full transaction (status update + audit log, atomically); bulk-import's validation pass against real edge cases | In CI, against the Free-tier dev Supabase project (never production) |
| **End-to-end** | Playwright | The Walking Skeleton flow itself: import → verify → appears in catalogue, exercised as a real user would, not just at the API level | In CI on every PR, and manually before any release build |

## What Specifically Gets an Automated Test, Story by Story (Walking Skeleton)

| Task | Test |
|---|---|
| T-01 | ⚠️ Manually verified only (direct CLI query during T-01), **not yet an automated test** — worth adding as a real integration test so the 23-row/exact-name guarantee can't silently regress if the seed migration is ever touched again |
| T-02 | ✅ Built. 8 Vitest unit tests in `src/lib/sanitizeCsvCell.test.ts`: leading `=`/`+`/`-`/`@`, leading-space bypass, tab/CR alone and combined, nested/repeated runs (e.g. `" = =cmd"`), empty string, and null/undefined (a real crash risk caught during review). *Correction from this document's original draft, written before T-02 was built: the originally-planned "missing image / duplicate detection" test cases turned out to belong to T-03, not T-02 — T-02's real automated coverage is the sanitizer, since the filename-matching logic itself was verified manually against real sample data rather than unit-tested.* |
| T-03 | ✅ Built. 6 Vitest unit tests in `src/lib/isDuplicateCover.test.ts`: exact GI Item + Date of Issue match (true positive); different GI Item with the same date, and the same GI Item with a different date (true negatives); empty existing-list; and blank-input guards, including a blank-incoming-value-vs-existing-null false-positive check. *Correction from this document's original plan: the actual matching logic couldn't be tested against a live Supabase client directly, because reading `covers` across all statuses needed a server-side Route Handler + service-role key (no RLS/grants exist for the anon role yet) rather than a direct client query — so the pure matching function (`isDuplicateCover`) was deliberately split out dependency-free and unit tested, while the Route Handler itself (`/api/check-duplicate-covers`) currently has **no automated test**, only a manual live verification (seeded a genuine duplicate row in the real database, confirmed only that row flagged, then cleaned up). That route is a real integration-test gap, same class as T-01's.* |
| T-04 | ✅ Built. This is the repo's first real integration test (`src/lib/coversRls.integration.test.ts`, requires live Supabase credentials in `.env.local` — see `vitest.config.mts`, which loads them). 9 tests, all three roles, both the positive and negative case each: Admin full read/write (select, update, insert, delete); Verifier sees `draft`/`flagged` but not `verified`, and every write attempt is rejected (update/delete silently affect 0 rows — RLS with no matching policy — while insert raises an explicit RLS-violation error, since `WITH CHECK` has no existing row to just filter out); Collector sees only `verified`, same write-rejection pattern. Creates and signs in as three real throwaway Supabase Auth users per run, cleans all of them up (users, profiles, covers) in `afterAll` — verified via direct query that cleanup actually leaves zero rows behind, not just assumed. |
| T-05 | ✅ Built. Unit tests for the three new pure functions: `src/lib/parseDateOfIssue.test.ts` (9 tests — real Excel-date and dot-separated text formats, both day-first, confirmed against the actual source file; 2-digit-year pivot; blank; invalid calendar dates; unrecognized formats), `src/lib/extractGiRegistrationNumber.test.ts` (5 tests — single number, the real multi-number case, no-annotation passthrough, case-insensitivity), `src/lib/normalizePostalCircle.test.ts` (3 tests — all 8 known variants, an already-official name passthrough, an unrecognized value passthrough). Plus a real integration test, `src/app/api/confirm-import/route.integration.test.ts` (5 tests, live Supabase — the pattern this doc already wished T-03's route had): valid row creates a draft cover with correct extraction/normalization; missing image fails without creating anything; unparseable date fails without creating anything; two within-batch duplicates — first succeeds, second fails; unrecognized postal circle still creates the row with `postal_circle_id = NULL` and a flag. The upload-then-cleanup-on-insert-failure path was also verified live by temporarily revoking `service_role`'s `INSERT` grant, confirming the orphaned Storage object actually gets deleted, then restoring the grant — not just reviewed as code. |
| T-06 | Integration test: calling `verify_cover()` with `status='flagged'` and no reason fails; with a reason, succeeds and produces exactly one new audit-log row |
| T-08/T-09 | E2E test: a seeded Verified cover appears in the catalogue list and its detail view shows every schema field |

## RLS Testing — Worth Calling Out Specifically

Every RLS policy gets tested from **all three roles**, not just the one it's meant to grant — the interesting test is usually the negative case (a Collector attempting to read a Draft cover, a Verifier attempting to write metadata), since that's where a subtle policy bug actually causes damage.

## CI Gate (ties to ADR-006)

On every PR: lint + typecheck + unit tests + integration tests (against the dev Supabase project) must all pass before merge is allowed. E2E tests run on every PR too, but a failure there prompts a manual look rather than an automatic block, since browser-based E2E tests are more prone to environmental flakiness than the layers below them.

**Status as of T-03:** no CI pipeline exists yet in either repo — this whole section describes the plan, not current reality. `npm run build` in the Admin repo does chain in one piece of it early (`npm run check:secrets`, the service-role-key leak guardrail — see `Threat-Model.md`), but that only runs locally today, not as a PR gate. Full CI setup is ADR-006 / Session 7 work, not yet started.

## What's Deliberately Not Covered Yet

Test strategy for stories beyond the Walking Skeleton isn't detailed here, for the same staleness reason the LLD is scoped narrowly — extend this table story-by-story as each one is actually picked up.
