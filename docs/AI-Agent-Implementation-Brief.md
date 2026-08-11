# PhilaIndiaCovers — §10 AI-Agent Implementation Brief

Purpose-built for Claude Code execution. Turns everything locked in §1-§9 into agent-executable work.

---

## 10.1 Repo & Environment Context

**Repo structure:** Two separate GitHub repos, deliberately (see rationale discussed live — smaller, focused context per repo suits an AI-agent-built project better than one tangled monorepo):

- **`philaindiacovers-app`** — the Electron consumer desktop app
- **`philaindiacovers-admin`** — the Next.js admin/verifier back-office

*(Suggested names — rename before creating if you'd prefer something else.)*

**Shared dependency between the two repos:** Supabase-generated TypeScript types describing the database schema (§6.4). Regenerate via the Supabase CLI (`supabase gen types typescript`) whenever the schema changes, and copy the output file into both repos — a manual but simple sync step, not an ongoing maintenance burden at this schema's size.

**Branch strategy:** Trunk-based. `main` always deployable. One short-lived branch per story/task (e.g. `us-13-add-collection-entry`), merged via a self-reviewed PR, deleted after merge. No `develop`/`release`/`hotfix` branches — that overhead is for coordinating multiple humans, which doesn't apply here.

**Required tools/access for Claude Code sessions:**
- GitHub CLI or git access to both repos
- Supabase project credentials (URL + anon key for client-side; service role key kept server-side only, never in the Electron app bundle)
- Node.js + npm/pnpm for both repos

**CLAUDE.md — one per repo, drafted below. Keep each short; per the template's own guidance, a bloated CLAUDE.md gets ignored, not obeyed.**

### Draft `CLAUDE.md` for `philaindiacovers-app` (Electron)

```markdown
# PhilaIndiaCovers — Consumer App

## Stack
Electron + React. Talks directly to Supabase (Postgres + Auth + Storage), no custom backend server.

## Environment
Requires a `.env` with Supabase URL and anon key (never commit this file — see `.env.example`).
Supabase project region: AWS Mumbai (ap-south-1).

## Conventions
- Voice/tone: playful and courteous throughout (see §7 UX/Design) — this applies to UI copy, not code comments.
- Auth: email/password + Google SSO only for v1 (Apple SSO dropped — see PRD §5/§3.2 for why).
- Offline behavior: reads work from local cache when offline; writes are blocked with a clear message, not queued (see FR-16). Don't build offline write-sync — it's a deliberate scope decision, not an oversight.

## Known gotchas
- Supabase RLS blocks a Verifier role from writing directly to `covers` metadata — that's intentional (see the `verify_cover()` function in the admin repo's schema notes). Don't work around it from this app.
- Postal Circle and Product Category values: Postal Circle is a constrained lookup (23 official India Post circles); Product Category is free text, not constrained — don't add validation that doesn't exist in the schema.

## Testing
[Fill in once a test runner is chosen during initial setup]

## Branch/PR conventions
Branch per story: `us-##-short-description`. PR to `main`, self-reviewed before merge.
```

### Draft `CLAUDE.md` for `philaindiacovers-admin` (Next.js)

```markdown
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

## Testing
[Fill in once a test runner is chosen during initial setup]

## Branch/PR conventions
Same as the consumer app repo: branch per story, PR to `main`, self-reviewed before merge.
```

---

## 10.1a Session Continuity (Critical — see dedicated playbook)

Full detail in a separate file: `PhilaIndiaCovers-ClaudeCode-Continuity-Playbook.md`. Summary: a `/standup` custom Claude Code command reconciles `.claude/PROGRESS.md` against actual Jira status and actual merged GitHub PRs at the start of every session — catching drift rather than trusting a manually-updated file blindly. A matching `/wrapup` command closes out each session properly. Set up once per repo (both `philaindiacovers-app` and `philaindiacovers-admin`).

## 10.2 Reference Patterns

No existing code yet — there's nothing to point Claude Code at to extend. The **Walking Skeleton** (below, §10.3) is what establishes the first real patterns; once it exists, later tasks should reference it directly rather than this PRD alone.

---

## 10.3 Task Decomposition for Agent Execution

Breaking all 42 stories into full task-level detail now — before any code exists — would go stale fast and isn't good practice; the template itself recommends sizing tasks close to when work actually starts, not all upfront. Instead: **full detail for the Walking Skeleton** (the genuinely correct starting point, since it proves the riskiest unknown first), plus **the methodology** to repeat for every later story as it's picked up.

### Walking Skeleton — fully decomposed, build this first

| Task ID | Linked Story | Description | Explicit Non-Goals | Verification Check |
|---|---|---|---|---|
| T-01 | US-36 | Set up Supabase project (Mumbai region), create the `profiles` table (needed first — `covers.verified_by` is a hard FK to it) and the `covers` table per §6.4 schema, seed `postal_circles` with the 23 official circles | No RLS policies yet — that's T-04 | Query `postal_circles` returns exactly 23 rows matching the official list |
| T-02 | US-36 | Build the admin bulk-import screen: upload a CSV + image files, validate every referenced filename exists, show a preview of failures | No duplicate-detection yet — that's T-03. No actual DB insert yet — that's T-05 | Upload a test CSV with one deliberately-missing image; preview correctly flags that one row and no others |
| T-03 | US-36, FR-17 | Add duplicate detection to the import preview: flag rows matching an existing cover's GI Item + Date of Issue | — | Import a CSV containing one deliberate duplicate of an already-seeded test cover; only that row is flagged |
| T-04 | US-35 | Write RLS policies for `covers`: Admin full r/w, Verifier read-only on `draft`/`flagged`, Collector read-only on `verified`. Also required explicit `GRANT`s to `authenticated` (this project's "Automatically expose new tables" setting suppresses default grants — RLS alone doesn't restore a missing base grant) and a `current_profile_role()` `SECURITY DEFINER` helper so policies can check the caller's role without granting direct table access to `profiles` | No `verify_cover()` function yet — that's T-06. **Does NOT close the `/api/check-duplicate-covers` access-control gap tracked since T-03** — that requires real application-level auth (login, session verification, route-level role check), none of which exists in either app yet. That's a distinct auth-specific task, not a natural extension of writing RLS policies for a table; deliberately not attempted here rather than half-solved. **Now has a real home: T-06.5**, added retroactively once it was clear no task in the original decomposition ever built Admin/Verifier auth at all | Attempt a direct Verifier-role UPDATE on `covers` via the Supabase client; confirm it's rejected by the database, not just hidden in UI |
| T-05 | US-36 | ✅ Built. Wired the import screen's "confirm" action (`POST /api/confirm-import`) to actually create `draft` rows in `covers` and upload the corresponding image to Supabase Storage. Includes: (a) extracting `gi_registration_number` by pattern-matching it out of "Name of the GI Tag / Item" text (e.g. "(GI No. 438)"), capturing the full matched content when a row embeds more than one number, not just the first; (b) parsing `date_of_issue` from real Excel dates and free-typed `DD.MM.YYYY` text alike, both confirmed day-first against the actual source file; (c) normalizing 8 known postal-circle name variants to their official name (`docs/Postal-Circles-Reference.md`) before the `postal_circle_id` FK lookup — an unmapped circle name gets `postal_circle_id = NULL` and is flagged, not blocked; (d) re-sanitizing every field server-side via the shared `sanitizeCsvCell` (never trusting the client already did it) and re-checking for duplicates server-side too, including *within* the same import batch, which a client-only check can't catch. Built as a Next.js Route Handler, consistent with T-03's `/api/check-duplicate-covers` precedent, to reuse the existing service-role client and Vitest tooling rather than introduce a second (Deno) runtime mid-project — this is now the settled architecture, corrected directly in `docs/API-Integration-Contracts.md`'s "Bulk import" section (was previously described there as "Edge Function, not a simple table insert"; the mismatched citation this row originally had, "§10.1a," was also wrong — that section is Session Continuity, unrelated) | Inherits `/api/check-duplicate-covers`' access-control gap (T-03/T-04) — same owner, T-06.5 | After confirming a valid test import, the new rows appear in the database with `verification_status = 'draft'` and the image exists in the `cover-images` Storage bucket at the path stored in `image_file`. Also: a row whose GI Tag/Item text embeds a GI number extracts it correctly into `gi_registration_number`; rows with real messy date formats from `PhilaIndiaCovers-Inventory-Ver 0.0.xlsx` (e.g. "05.09.2021") parse into a correct `date_of_issue`, not just the clean ISO dates in the T-02 test fixture. Verified live end-to-end (real rows, real Storage upload, real DB insert, then cleaned up) and via a persisted integration test suite, `src/app/api/confirm-import/route.integration.test.ts` |
| T-06 | US-39, FR-22, FR-23 | Implement the `verify_cover()` function: Verifier-only, validates reason-if-flagged, updates status + writes to `verification_audit_log` atomically | No UI for this yet — that's T-07 | Call the function directly (e.g. via Supabase SQL editor) on a test Draft row; confirm both the cover's status and a new audit-log row change in one transaction |
| T-06.5 | US-34 (EPIC-08, Admin & Verifier Access) — "As an Admin or Verifier, I want to log into the back-office via email/password or Google SSO, so that I can access my role's tools" | ✅ Built (2026-08-08). Login UI at `/login` (`src/app/login/page.tsx`) — email/password via `supabase.auth.signInWithPassword()`, live-verified working. **Google SSO's UI is deliberately hidden, not just untested**: checked live before merge, and without Google's OAuth Client ID/Secret + Supabase's "Manual Linking" setting configured in the dashboard, clicking it navigated the whole browser away to the Supabase project's own domain showing a raw `{"error_code":"validation_failed",...}` JSON response — genuinely broken, not a clean in-app error. Gated behind a plain code constant, `GOOGLE_SSO_ENABLED = false` (not an env var — a one-off dashboard-config-driven toggle doesn't warrant new flag surface), with a "Google sign-in isn't set up yet" message in its place; the `signInWithOAuth` call itself needs no changes once the dashboard side is done — flip the constant and re-verify live. Session verification for `/api/check-duplicate-covers` and `/api/confirm-import` is `requireRole()` (`src/lib/requireRole.ts`) — Bearer-token, not cookie-based (see **ADR-008** for why, over `@supabase/ssr`): the browser attaches `Authorization: Bearer <access_token>`, the route verifies it via `supabase.auth.getUser(token)` (a real round-trip to Supabase Auth, not a decoded claim) and looks up the role via the service-role client. No self-service signup exists anywhere in the back-office, so accounts are provisioned via `scripts/provision-user.mjs` (`npm run provision:user -- --email=... --password=... --role=admin\|verifier`), pre-confirmed (`email_confirm: true`) — there's no unconfirmed-user state to gate, so no email-verification flow was built | No Verifier-facing review UI yet — that's T-07, which can now build on a real session instead of a manually-set test account. No consumer-app (Electron) Collector login — that's a separate repo/story with its own auth flow, not covered here. No password-reset/email-verification flows. **Also not built**: page-level route protection (e.g. redirecting an unauthenticated visitor away from `/import`) — enforcement lives entirely at the two API routes, where the actual data/write risk is; see ADR-008 | An unauthenticated request to `/api/check-duplicate-covers` is rejected (401), not served — ✅ confirmed both live (real browser session vs. no token) and via `route.integration.test.ts` (5 tests: Admin succeeds, no/invalid token → 401, Verifier/Collector → 403). A real Verifier test account can log in through the UI and reach an authenticated session — ✅ `src/lib/login.integration.test.ts` (4 tests: correct password succeeds with a real access token, a real provisioned email with the wrong password fails, a never-provisioned email fails, account is pre-confirmed). A request to `/api/confirm-import` from a logged-in Admin session succeeds; from a logged-in Verifier session, it's rejected and creates nothing — ✅ `route.integration.test.ts` (2 new tests: no-token → 401 creates nothing, Verifier → 403 creates nothing) |
| T-07 | US-39 | ✅ Built (2026-08-08). `/review` (`src/app/review/page.tsx`) — lists Draft/Flagged covers, each row expandable to full details + image, with Verify and Flag-with-reason (required, mirrored client-side and DB-level) actions. **No new Route Handler** — confirmed explicitly before building, not assumed by default: T-04's RLS already grants the Verifier's own authenticated client direct SELECT on draft/flagged `covers` (`src/lib/reviewQueue.ts`), and `verify_cover()` (T-06) is already a `SECURITY DEFINER` function with its own internal role check, callable directly via `.rpc()`. Neither of the reasons the two existing routes needed service-role (pre-auth RLS bypass; Storage writes with no `authenticated` grant) applies to a list-then-RPC screen. **Image display needed a new mechanism**, since `cover-images` had zero `authenticated` policies (T-05, service-role-only): added `storage.objects` RLS policies (`20260808153406_cover_images_review_read_policies.sql`) mirroring `covers`' own shape — Admin reads any status, Verifier reads draft/flagged only — so the browser downloads images directly via the Storage API, no server route. **Real infra gap found and fixed along the way**: `postal_circles` (needed for the queue's circle-name join) had no `authenticated` grant and no RLS policy at all — predates the blanket default-privileges migration like `covers` did, but unlike `covers` never got its own explicit grant; fixed in `20260808153633_postal_circles_public_read.sql`, implementing the "Public read" design `API-Integration-Contracts.md` already documented but nothing had actually built | No consumer-app catalogue view yet — that's T-08/T-09, which will need their own (**authenticated**, verified-only) Storage read policy, a distinct design question from this task's Admin/Verifier one — **corrected 2026-08-11 (T-08 planning)**: this cell previously said "public," which was stale wording carried over from `API-Integration-Contracts.md` §4's own since-corrected error; the App repo has no anonymous browsing at all, so this was never actually meant to be anon-accessible | Using a real Verifier account authenticated through T-06.5's login, mark a seeded Draft entry Verified; confirm it updates immediately — ✅ verified live: flagged a seeded cover with a reason (audit log recorded the exact reason), re-verified it (dropped out of the queue, as its RLS-visible statuses no longer include it), then confirmed via a direct query mimicking the future consumer app's catalogue query that the row appears with `verification_status = 'verified'`, `verified_by`, and `verified_at` set |
| T-07.5 | US-01, US-03 | Electron + React scaffolding (`electron-vite`, React+TS) plus a minimal Collector email/password login (`supabase.auth.signInWithPassword()`) in the App repo — needed before T-08 can query anything, since `covers` has no `anon` grant at all and a real authenticated Collector session is a hard prerequisite, not an enhancement. Also provisions a persistent test Collector account (`scripts/provision-collector.mjs`, App repo) for this and future App-repo verification, mirroring this repo's `provision-user.mjs` — role is `collector` by default via `handle_new_user()`, no role-setting logic needed, but the script explicitly checks the trigger actually created the `profiles` row rather than assuming it, same rigor as this session's NULL-role-guard investigation | No Google SSO — Electron can't do a simple `signInWithOAuth` + `redirectTo` the way a browser app can (Google's ToS blocks embedded-webview OAuth; a real implementation needs `shell.openExternal` + a custom protocol handler or loopback redirect capture), so this is fully deferred, not just hidden behind a flag like T-06.5's Admin/Verifier login. No self-service signup (FR-26/27/28) — login only, using a script-provisioned test account. No password-reset/email-verification flows | A real, script-provisioned test Collector account signs in through the App's login screen and reaches a session where `current_profile_role() = 'collector'` — confirmed live, and the provisioning script itself confirms (not assumes) the `profiles` row was trigger-created |
| T-08 | US-07 | Build the consumer app's catalogue list view: query `covers` (joined to `postal_circles` for the circle name) where `verification_status = 'verified'`, display thumbnail/GI Item Name/Product Category/Issuing Postal Circle/Date of Issue for each. Requires a new `storage.objects` read policy for `cover-images` (this task's own scope, built in the Admin repo), since none exists yet for any role but `service_role`/Admin/Verifier (T-07) | No filtering/search/sort yet — that's US-08/09/10. No offline caching (FR-16). Login itself is T-07.5, not this task | The one real Verified test cover (from T-07's live verification) appears correctly in the consumer app's list, thumbnail included, using a real authenticated Collector session (T-07.5) |
| T-09 | US-11 | Build the cover detail view: full schema fields + full-size image on selection | — | Selecting the test cover shows every field not present in the list view |

**This slice, once complete, proves:** spreadsheet → validated import → Draft → Verifier review → Verified → visible to a collector, end-to-end. Every later story builds on top of a proven pipeline instead of an assumed one.

### Methodology for all later stories (repeat this per story, when it's actually about to be picked up)

1. Take the story's Given/When/Then AC directly from `PhilaIndiaCovers-Epics-UserStoryMap.md`.
2. Break it into 5-15-minute agent-sized tasks — each a vertical slice (touches DB → logic → UI where relevant), each ending in something a human can manually check.
3. Give each task a **concrete verification check** — a test, a script, or a screenshot comparison — never just a description of what "done" should look like. This is the single highest-leverage thing in this whole section; don't skip it to save time.
4. State explicit non-goals per task (what this task should NOT touch), the same way the Walking Skeleton table does above.

---

## 10.4 Workflow and Guardrails

- **Explore → Plan → Implement → Commit** for anything beyond a trivial change. Skip straight to implementation only when the change is small enough to describe the diff in one sentence.
- **Files/modules the agent must not modify:** none yet (no repo exists) — revisit once the repos are initialized and this becomes a real list (e.g., generated Supabase type files should be regenerated, not hand-edited).
- **Patterns the agent must not introduce without a deliberate check:**
  - New paid dependencies or services without first checking cost — this project has a demonstrated pattern of catching real costs late (Supabase region capacity, Apple Developer Program fee); don't repeat that pattern from the code side.
  - Schema changes without updating the type-generation step in both repos (see §10.1's shared-dependency note).
  - Any UI-only permission check standing in for real RLS enforcement — every role boundary in this PRD (FR-25 especially) is meant to be enforced at the database level.
  - Unlabeled "temporary" shortcuts (e.g., a hard-coded redirect/destination because only one currently exists) — must carry an explicit, logged trigger condition for when to revisit, in both a code comment and the task's PROGRESS.md entry, not just an implicit "fix later." A real bug shipped this way in the admin repo: `/login`'s redirect was hard-coded to `/import` with nothing flagging that it needed revisiting once a second, role-specific page (`/review`) existed.
  - A new role-differentiated page/route without live-verifying every existing role through the real shared entry point (not just the new page's own intended user) — this is how a Verifier ended up landing on the Admin's `/import` screen after `/review` shipped, caught only in later manual testing rather than at that task's own review.
- **Permissions/sandbox:** confirm Claude Code's write access is scoped to the two project repos only, with Supabase service-role credentials kept out of any client-side code path entirely.

### CI/CD (Session 7)
**GitHub Actions**, native to the already-chosen repo host, free tier sufficient at this scale:
- On every PR: lint + typecheck + automated tests run automatically as the real quality gate before merge (not just self-review).
- On merge to `main`: the admin repo already auto-deploys via Vercel, no extra job needed. The consumer app repo gets a release job triggered by a version tag (e.g. `v1.0.0`) that builds the **MSIX package** (see distribution note below) and pushes it to GitHub Releases as the mirror already planned in §11.
- Scales later without switching tools: same setup extends to more platforms or more automation as needed.

### Distribution packaging (Session 7 — supersedes earlier code-signing cost concern)
Distributing via the **Microsoft Store** (confirmed free for individual developers as of Sept 2025 — the old $19 fee was eliminated) means Microsoft signs the MSIX package automatically at no cost. This makes the earlier ~$195+/year code-signing certificate concern moot for this distribution path. Requires packaging the Electron app as **MSIX** (supported by electron-builder/electron-forge) — a build step to plan for, not a cost.

### Auto-update behavior (Session 7)
`electron-updater` configured with **`autoDownload = false`**. On `update-available`, show an in-app banner ("A new version is available — update now?"); only download/install on explicit user action. Matches the PRD owner's stated preference — announce, don't force.

### Environment separation (Session 7)
**Two Supabase projects**, not one: a Free-tier "dev" project for all development/testing (including everything Claude Code touches during the build), and the Pro "production" project once launched. Fits inside Supabase's own "up to 2 active projects on Free" allowance — no extra cost while both are on Free during the build. Never test against the real, SME-verified catalogue.

### Backup restore testing (Session 7)
Don't just take backups — periodically (roughly quarterly, or before any major schema change) actually restore the latest backup into the free dev project and spot-check that known rows/counts match. An untested backup is not a real safety net.

---

## 10.5 Verification Loop (run after every task/story, not just at the end)

1. **Automated:** whatever test/script/screenshot check was defined for that task in §10.3.
2. **Manual:** PRD owner verifies against the story's Given/When/Then AC directly — ask Claude Code to show evidence (test output, screenshots) rather than just asserting success.
3. **Adversarial review (recommended for anything touching RLS, the verification workflow, or auth):** use a fresh-context subagent to review the diff against the task's stated requirements and non-goals before calling it done.
4. **If stuck on the same task twice**, don't keep correcting incrementally — clear context and restart with a sharper prompt incorporating what was learned.

---

## 10.6 Human Review Checkpoints

Explicit human (PRD owner) review required before merge, even if all automated checks pass, for:
- Anything touching **authentication** (signup, login, account linking — FR-26/FR-28's linking behavior especially, since it silently merges accounts by email match)
- Anything touching **RLS policies or the `verify_cover()` function** — this is the database-level enforcement behind FR-25's accuracy guardrail; a subtle bug here undermines the entire trust model of the catalogue
- Anything touching **bulk import's validation/duplicate-detection logic** (FR-17, FR-20) — a bug here risks polluting the shared catalogue, which is the actual product
- **Account deletion** (FR-31) — irreversible by nature, worth a deliberate look every time this code path changes
