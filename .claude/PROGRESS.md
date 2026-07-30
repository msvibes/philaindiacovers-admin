# Progress Snapshot — philaindiacovers-admin

**Last updated:** 2026-07-30
**Last session worked on:** T-01 (US-36) — Supabase schema setup

## Current state
Supabase project (`hcaivtygzwjemjngcmji`) linked via CLI. Migrations applied and verified: `profiles`, `postal_circles`, `covers` tables created; `postal_circles` seeded with all 23 official India Post circles (verified by direct query — exact count and exact names, including "Orissa"/"North Eastern" preserved as-is). No RLS policies yet (explicit T-01 non-goal — that's T-04). `docs/` added with the API Integration Contracts, AI-Agent Implementation Brief, and Postal Circles Reference; `CLAUDE.md` points future sessions there. Work is on branch `us-36-t01-supabase-schema-setup` (commit `569414e`), pushed to origin — **PR not yet created**, see gotcha below.

## In progress
Nothing in progress. T-01 is genuinely complete per its stated verification check (postal_circles returns exactly 23 rows).

## Next up
T-02 (US-36): build the admin bulk-import screen — upload a CSV + image files, validate every referenced filename exists, show a preview of failures. Explicit non-goals: no duplicate-detection yet (T-03), no actual DB insert yet (T-05).

## Known gotchas from recent sessions
- `gh` CLI is not installed on this machine, so I couldn't open a PR for the T-01 branch myself. The branch `us-36-t01-supabase-schema-setup` is pushed to GitHub — open the PR manually (GitHub showed a direct link when the branch was pushed) and merge before starting T-02.
- The schema doc (`docs/API-Integration-Contracts.md`) has `covers.verified_by` as a FK to `profiles.id`, but the Walking Skeleton task table never explicitly assigns a task to creating `profiles`. It was created as part of T-01 out of technical necessity (the FK can't exist otherwise), not from an explicit task — worth confirming this was the right call, or whether `profiles` deserves its own task ID retroactively.
- Local `supabase db push` needs Docker Desktop running to cache the migration diff cleanly; without it, the push still succeeds (confirmed via direct row/name query against the linked project) but throws a wall of Docker-connection warnings. Docker Desktop is now running on this machine, so this shouldn't recur.
- Prior session's commits (`5f7b259`, `34fedbc` — continuity system + wrapup) were pushed directly to `main`, a one-off exception for scaffolding. T-01 is the first real story, so the branch + PR convention now applies strictly going forward.
