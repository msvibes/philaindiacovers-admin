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
| T-04 | US-35 | Write RLS policies for `covers`: Admin full r/w, Verifier read-only on `draft`/`flagged`, Collector read-only on `verified` | No `verify_cover()` function yet — that's T-06 | Attempt a direct Verifier-role UPDATE on `covers` via the Supabase client; confirm it's rejected by the database, not just hidden in UI |
| T-05 | US-36 | Wire the import screen's "confirm" action to actually create `draft` rows in `covers` | — | After confirming a valid test import, the new rows appear in the database with `verification_status = 'draft'` |
| T-06 | US-39, FR-22, FR-23 | Implement the `verify_cover()` function: Verifier-only, validates reason-if-flagged, updates status + writes to `verification_audit_log` atomically | No UI for this yet — that's T-07 | Call the function directly (e.g. via Supabase SQL editor) on a test Draft row; confirm both the cover's status and a new audit-log row change in one transaction |
| T-07 | US-39 | Build the Verifier's review screen: list Draft/Flagged entries, Verify/Flag-with-reason buttons calling `verify_cover()` | — | Using a test Verifier account, mark a seeded Draft entry Verified; confirm it updates immediately |
| T-08 | US-07 | Build the consumer app's catalogue list view: query `covers` where `verification_status = 'verified'`, display thumbnail/name/category/circle/date | No filtering/search/sort yet | The one Verified test cover from T-07 appears in the consumer app's list |
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
