# PhilaIndiaCovers — Admin/Verifier Back-Office

## Stack
Next.js (React), hosted on Vercel. Talks to the same Supabase backend as the consumer app — this repo is a second client, not a separate backend.

## Environment
Requires `.env.local` with Supabase URL + anon key (client-side) and `SUPABASE_SERVICE_ROLE_KEY` (server-only, no `NEXT_PUBLIC_` prefix — never expose to the browser; see `src/lib/supabaseAdminClient.ts`). See `.env.example` for the full list. Deployed on Vercel's free tier.

## Roles this app serves
Admin (data entry, bulk import, corrections) and Verifier (review/verify/flag only — cannot edit metadata directly). Enforced at the database layer via RLS + the `verify_cover()` function, not by this app's UI alone — don't treat UI-level role-gating as sufficient on its own.

## Known gotchas
- Bulk import must validate every image filename exists BEFORE creating any entries, and must flag likely duplicates (matching GI Item + Date of Issue against existing covers of any status) — see FR-17, FR-20.
- A corrected Flagged entry returns to pending-review, not directly back to Verified — only the Verifier can re-mark it Verified (FR-24). Don't build a shortcut around this even for the Admin's convenience.
- **Temporary shortcuts need an explicit, logged trigger condition, not just a "temporary" label.** If something is simplified because an alternative doesn't exist yet (e.g., a hard-coded redirect because there's only one destination), document the specific condition under which it must be revisited — in a code comment AND the task's PROGRESS.md entry. An unlabeled shortcut is how a real bug happened here: `/login`'s redirect was hard-coded to `/import` when it was built (only an Admin account existed to test with at the time), and nothing flagged that it needed revisiting once `/review` — a second role-specific destination — shipped. It silently sent every Verifier to the Admin's screen until caught in later manual testing.
- **Whenever a new role-differentiated page or route is added, that task's live verification must include every existing role logging in through the actual shared entry point (`/login`), not just confirming the new page works for its own intended user.** Log in as each role, observe where they land, confirm what they can and can't do. This specific check — a Verifier logging in normally and landing on `/import` — would have caught the bug above immediately when `/review` shipped, rather than in a later manual testing session.

## Reference docs
Start at `docs/README.md` — it indexes the full documentation set and tells you which document covers what (schema, architecture decisions, threat model, test strategy, task breakdown, etc.), including which ones actually live in this repo's `docs/` versus the broader documentation package.

## Testing
Vitest for pure-logic/security-relevant units (`npm test`). Not a UI testing setup — component/E2E coverage is undecided; add here when that's chosen.

## Branch/PR conventions
Same as the consumer app repo: branch per story, PR to `main`, self-reviewed before merge.

**Direct-to-main exception for docs-only changes (explicit policy as of 2026-08-17):** `PROGRESS.md`, `CLAUDE.md`, `docs/**`, and `README.md` — pure documentation/process, never executed — may be pushed straight to `main`, no branch/PR required. Nothing else qualifies, even for a "tiny" change: `src/**`, `supabase/migrations/**`, `package.json`/`package-lock.json`, and `.github/workflows/**` always require a real branch + PR + passing CI.

This exists because `main` now has genuinely enforced branch protection (two active rulesets — `main-1` blocks deletion/force-push, `main-2` requires the `ci` status check to pass before merge). Repo-owner bypass on a GitHub ruleset applies universally, with no way to scope it by file path — so this boundary is a deliberate, scoped exception to that enforcement, written down so it stays a decision, not a gap nobody chose.
