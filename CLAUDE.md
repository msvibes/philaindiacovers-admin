# PhilaIndiaCovers — Admin/Verifier Back-Office

## Stack
Next.js (React), hosted on Vercel. Talks to the same Supabase backend as the consumer app — this repo is a second client, not a separate backend.

## Environment
Requires a `.env` with Supabase URL and anon key. Deployed on Vercel's free tier.

## Roles this app serves
Admin (data entry, bulk import, corrections) and Verifier (review/verify/flag only — cannot edit metadata directly). Enforced at the database layer via RLS + the `verify_cover()` function, not by this app's UI alone — don't treat UI-level role-gating as sufficient on its own.

## Known gotchas
- Bulk import must validate every image filename exists BEFORE creating any entries, and must flag likely duplicates (matching GI Item + Date of Issue against existing covers of any status) — see FR-17, FR-20.
- A corrected Flagged entry returns to pending-review, not directly back to Verified — only the Verifier can re-mark it Verified (FR-24). Don't build a shortcut around this even for the Admin's convenience.

## Reference docs
Full schema definitions and task-level requirements live in `docs/` — check `docs/API-Integration-Contracts.md` (schema/API contracts) and `docs/AI-Agent-Implementation-Brief.md` (task breakdown) before starting any story.

## Testing
[Fill in once a test runner is chosen during initial setup]

## Branch/PR conventions
Same as the consumer app repo: branch per story, PR to `main`, self-reviewed before merge.
