# Progress Snapshot — philaindiacovers-admin

**Last updated:** 2026-07-31
**Last session worked on:** T-02 (US-36) — admin bulk-import screen

## Current state
`main` is at `4926849`. Both Walking Skeleton tasks so far are done and merged:
- **T-01**: Supabase project (`hcaivtygzwjemjngcmji`) linked; `profiles`, `postal_circles`, `covers` tables created; `postal_circles` seeded with all 23 official circles (verified by direct query). No RLS yet (T-04). Merged via PR #1.
- **T-02**: `/import` bulk-import screen — upload CSV + images, parse client-side, preview which rows' image file is missing. Uses the real spreadsheet's headers (not DB column names). No duplicate detection (T-03), no DB insert (T-05), as scoped. Merged via PR #2, after several review-driven hardening rounds: real CSV headers replacing an earlier wrong assumption, CSV/formula-injection sanitization (including fixing a leading-space bypass, and confirming tab/CR were already covered), the sanitizer extracted into a shared, reusable `src/lib/sanitizeCsvCell.ts` (not left as UI-only logic), a Vitest suite (`npm test`, 8 tests) as permanent regression protection, and a null/undefined guard the tests caught was missing.

`docs/` (API Integration Contracts, Implementation Brief, Postal Circles Reference) and `CLAUDE.md` are in place from T-01. Jira: US-36 is In Progress (covers T-01/T-02/T-03 together — not yet Done since T-03/T-05 etc. remain); all other 41 stories are To Do.

## In progress
Nothing in progress. T-01 and T-02 are both genuinely complete and merged.

## Next up
T-03 (US-36, FR-17): add duplicate detection to the import preview — flag rows matching an existing cover's GI Item + Date of Issue. Verification check: a CSV containing one deliberate duplicate of an already-seeded test cover should have only that row flagged.

## Known gotchas from recent sessions
- **T-05 must call the shared CSV sanitizer — do not skip it or reimplement it.** Lives in `src/lib/sanitizeCsvCell.ts`, applied to every column via Papa Parse's `transform` option (not just the image filename). The T-02 UI check is convenience only, not a security boundary (per the Security/Trust-Boundary design) — T-05's actual insert path (the bulk-import Edge Function) must apply this exact same sanitization before persisting any CSV-derived value. The Edge Function runs on Deno, a different runtime than this Next.js app — if a direct import isn't practical there, T-05 must still use logic identical to it, not a separately-invented sanitizer. Regression-protected by `src/lib/sanitizeCsvCell.test.ts` — extend that file rather than re-verifying by hand if the logic ever changes.
- **T-05 must real-world-test date parsing before calling it done.** The T-02 fixture had dates normalized to clean ISO format, so it never exercised the actual source spreadsheet's mixed date formats (e.g. "05.09.2021"). T-05's `date_of_issue` parsing needs a real test against messy rows pulled directly from `PhilaIndiaCovers-PLabs.xlsx`, not just clean fixtures.
- **T-05 must extract `gi_registration_number` from "Name of the GI Tag / Item" text** (pattern-match, e.g. "(GI No. 438)") — it is not its own CSV column. Written into T-05's row in `docs/AI-Agent-Implementation-Brief.md`.
- `gh` CLI is not installed on this machine — PR creation and merge-status checks both require manual GitHub web UI steps. Also: GitHub auto-deleted T-01's branch on merge but did **not** auto-delete T-02's (had to be deleted manually after this session's reconciliation) — branch cleanup after merge isn't consistently automatic here, so check manually each time rather than assuming.
- Local `supabase db push` needs Docker Desktop running to cache the migration diff cleanly; without it, the push still succeeds but throws Docker-connection warnings. Docker Desktop is now running on this machine, so this shouldn't recur.
- The very first commits in this repo (`5f7b259`, `34fedbc` — continuity system + wrapup) were pushed directly to `main`, a one-off exception for scaffolding. T-01 onward, the branch + PR convention applies strictly.
