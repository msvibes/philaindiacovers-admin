# PhilaIndiaCovers — Admin/Verifier Back-Office

## Stack
Next.js (React), hosted on Vercel. Talks to the same Supabase backend as the consumer app — this repo is a second client, not a separate backend.

## Environment
Requires `.env.local` with Supabase URL + anon key (client-side) and `SUPABASE_SERVICE_ROLE_KEY` (server-only, no `NEXT_PUBLIC_` prefix — never expose to the browser; see `src/lib/supabaseAdminClient.ts`). See `.env.example` for the full list. Deployed on Vercel's free tier.

## Roles this app serves
Admin (data entry, bulk import, corrections) and Verifier (review/verify/flag only — cannot edit metadata directly). Enforced at the database layer via RLS + the `verify_cover()` function, not by this app's UI alone — don't treat UI-level role-gating as sufficient on its own.

## Decision-Making Autonomy

This section exists to reduce interruptions *without* losing the interruptions that actually mattered. Every rule below is grounded in a real incident from this project's history, not a hypothetical — where useful, the precedent is named so a future reader (human or Claude) can see why the rule exists, not just that it does.

**The governing principle:** autonomy scales with reversibility and precedent, not with how "small" a decision feels in the moment. A one-line CSS change with no security implication and a one-line schema change with a real security implication can look equally small in a diff — they are not equally safe to decide alone.

---

### Tier 1 — Proceed without asking. Note the decision in the PR description or commit message.

Use this tier when **all** of the following are true: the decision is reversible with a follow-up commit, there's a clear precedent already in this codebase to follow, and getting it wrong costs time, not damage.

- **Following an established pattern.** If the codebase already solved this exact shape of problem, apply the same solution rather than inventing a new one and asking which to use. *Precedent: `Catalogue.tsx` being lifted into a controlled component under `App.tsx` correctly cited `FilterPanel`'s prior controlled-component restructuring as the reason to do it the same way, without asking whether that was the right shape.*
- **File/component organization, naming, test-file splitting.** Follow whatever convention the surrounding code already uses (e.g., splitting test files by concern the way `Catalogue.*.test.tsx` already does).
- **Fixing a real lint/type error by restructuring code**, not by suppressing the rule. Suppressing a rule is a Tier 3 decision (see below); fixing the actual anti-pattern it caught is Tier 1.
- **Choosing between two technically-equivalent implementations** where neither has product-visible behavior differences (e.g., which of two internally-consistent state-management shapes to use, when both produce identical UI behavior).
- **Deferring genuinely low-stakes scope** that was never explicitly promised for the current task (e.g., image-loading throttling deferred as a non-urgent risk, explicitly reasoned and logged, not silently dropped).

---

### Tier 2 — Proceed, but flag prominently and explain the reasoning. Don't bury it in a diff.

Use this tier when the decision is technical, has a defensible right answer given enough investigation, but an *incorrect* answer would be genuinely costly to discover later — so the investigation and conclusion both need to be visible, even though a human doesn't need to bless it before code gets written.

- **Verify the actual behavior of a library/framework/DB feature before building on top of an assumption about it** — then proceed on what was verified, don't stop to ask permission to trust your own verification. *Precedent: reading `postgrest-js`'s actual source to confirm two `.or()` calls compose as independent AND'd filters, then building the UI on that confirmed behavior — right to verify, right to not also ask "is it OK that I verified this?"*
- **Read the actual security policy before relying on client-side logic for anything sensitive.** *Precedent: reading the real RLS policy SQL directly to confirm the database — not the client query — is the actual backstop, before shipping a feature whose correctness would otherwise depend on trusting client-side filter construction.*
- **Choose the more defensive/precise implementation when two options exist and one is strictly safer**, without needing sign-off on the safer choice itself. *Precedent: filtering by the direct `postal_circle_id` FK column instead of through a joined relation, because the joined-relation approach has known PostgREST fragility — a correct call to make and log, not to ask permission for.*
- **Catch and fix your own process mistake once discovered, and document it plainly.** *Precedent: a commit briefly landing on the wrong branch due to a shared working directory being switched mid-task — caught by checking the actual branch state after committing (not assuming), confirmed nothing had been pushed, moved to the correct branch, `main` reset to its exact prior pushed state, no force-push, no rewritten shared history. This did not need to become a stop-and-ask — it needed to be caught, fixed correctly, and disclosed clearly, all of which happened.*

---

### Tier 3 — Stop and ask before proceeding. Do not guess, and do not build UI or infrastructure around an unresolved version of the answer.

This is the tier that matters most, because every one of these categories has a real, named incident this session where guessing would have been genuinely wrong — not just imperfect.

#### A required data source, schema, or integration doesn't exist yet
Do not invent a placeholder, do not build UI that assumes data which isn't confirmed to exist, do not silently drop the requirement either.
*Precedent: FR-33 (GI registry outbound link) had zero resolved data source — no DB column, no lookup table, no confirmed URL structure from the actual government registry. The correct move was refusing to guess at a hardcoded URL map or a placeholder schema column, and instead splitting it into its own explicitly-unresolved task.*

#### Anything touching credentials, secrets, or account lifecycle
Never hold, request storage of, or attempt to reconstruct a real credential. When a task needs one, ask for a fresh, scoped, throwaway credential — and when a credential needs to stop existing, verify the deletion independently rather than trusting a single call's own success response.
*Precedent: this project's entire session-long pattern of provisioning fresh throwaway Collector accounts per task, and — critically — the `t14-verify` account being wrongly marked "deleted" in `PROGRESS.md` at one point when it wasn't; the eventual real deletion was only trusted once confirmed two independent ways (a fresh `listUsers` re-query, plus a separate sign-in-attempt check needing no service-role access at all).*

#### A decision carries real legal, political, financial, or safety weight
This includes anything touching intellectual property, government/political boundaries or names, money commitments, or content a non-lawyer shouldn't be drafting as if it were reviewed legal text.
*Precedents: refusing to hand-code India's state political boundaries and instead sourcing verified data with an explicit Ladakh/J&K currency check; the Apple Developer Program's $99/year enrollment being a real budget decision, not an engineering one; disclaimer/EULA content being explicitly flagged as "standard pattern, not lawyer-reviewed" rather than presented as authoritative.*

#### Two reasonable approaches produce genuinely different product behavior
Not different code shape — different behavior a user would actually notice or a business would actually care about.
*Precedents: signup being approval-gated vs. open-with-account-linking (a real access-control policy, not an implementation detail); Date of Issue as a date-range picker vs. a year-based multi-select (different interaction models, no existing precedent to inherit); whether prev/next navigation should respect the active filter set or always cycle the full catalogue.*

#### Expanding the scope of an already-approved, in-progress piece of work
Even a cheap, obviously-correct addition should become its own task if the work it would ride on top of has already been planned and approved — because "cheap addition" and "safe to bolt onto approved work" are different questions.
*Precedent: FR-11–14 (and later, the browse-by-year timeline) were correctly kept out of the in-flight T-13+T-18 PR and given their own sequenced task, even though they touched adjacent code, specifically because that PR was already approved and shouldn't be expanded mid-flight.*

#### A summary or status claim can't actually be reconciled against real evidence
If a written record (PROGRESS.md, a Jira status, a prior session's summary) disagrees with what git, the database, or the actual running app shows — stop and surface the disagreement rather than silently trusting either side.
*Precedents: multiple standup reconciliations this session existed specifically to catch stale board statuses, stale PROGRESS.md entries, and once, a genuinely stale claim that an account had been deleted when it hadn't.*

---

### Two standing rules that apply regardless of tier

**Audit before adding, not just before removing.** Before creating a new task, requirement, or tracked item, check whether something already covers it. *Precedent: two real duplicate task IDs were created this session (a menu-bar task and a timeline-view task, each independently recreated later without checking whether an earlier one already existed) — caught only because a later reconciliation pass happened to notice, not because anyone checked at creation time.*

**A decided requirement with no owner will quietly not happen.** When a requirement is agreed to in conversation, it needs to be attached to a concrete, trackable task in the same breath — not left to "obviously get built eventually" as part of a larger task's implied scope. *Precedent: three separate real gaps this session (a Date-of-Issue field, a Home screen, dark mode) were each genuinely decided at some point but never given a task ID, and each was later discovered missing from the actual running app.*

## Known gotchas
- Bulk import must validate every image filename exists BEFORE creating any entries, and must flag likely duplicates (matching GI Item + Date of Issue against existing covers of any status) — see FR-17, FR-20.
- A corrected Flagged entry returns to pending-review, not directly back to Verified — only the Verifier can re-mark it Verified (FR-24). Don't build a shortcut around this even for the Admin's convenience.
- **Temporary shortcuts need an explicit, logged trigger condition, not just a "temporary" label.** If something is simplified because an alternative doesn't exist yet (e.g., a hard-coded redirect because there's only one destination), document the specific condition under which it must be revisited — in a code comment AND the task's PROGRESS.md entry. An unlabeled shortcut is how a real bug happened here: `/login`'s redirect was hard-coded to `/import` when it was built (only an Admin account existed to test with at the time), and nothing flagged that it needed revisiting once `/review` — a second role-specific destination — shipped. It silently sent every Verifier to the Admin's screen until caught in later manual testing.
- **Whenever a new role-differentiated page or route is added, that task's live verification must include every existing role logging in through the actual shared entry point (`/login`), not just confirming the new page works for its own intended user.** Log in as each role, observe where they land, confirm what they can and can't do. This specific check — a Verifier logging in normally and landing on `/import` — would have caught the bug above immediately when `/review` shipped, rather than in a later manual testing session.
- **Never build a test (or a regex character class) around a literal accented/combining Unicode character typed or generated directly in source — construct it from explicit code points (`String.fromCharCode`) or check by numeric code-point range instead.** A typed accented character can get silently normalized to a different encoding (NFC vs. NFD) by an editor, formatter, or even the authoring process itself before it ever reaches the file — which can make a test comparing "two different encodings of the same character" meaningless without anyone noticing, or corrupt a regex range into something subtly wrong. This bit `normalizeFileName.test.ts` once, then bit `sanitizeStorageKey.ts` twice more while fixing the very next bug in the same filename-handling path — three separate times in one investigation, all the same root cause. If you're writing any code that touches Unicode normalization, accented characters, or a character-class regex referencing a Unicode range, build the values programmatically and verify the actual bytes (e.g. `codePointAt`) before trusting the file — don't assume a typed character round-tripped correctly.

## Reference docs
Start at `docs/README.md` — it indexes the full documentation set and tells you which document covers what (schema, architecture decisions, threat model, test strategy, task breakdown, etc.), including which ones actually live in this repo's `docs/` versus the broader documentation package.

## Testing
Vitest for pure-logic/security-relevant units (`npm test`). Not a UI testing setup — component/E2E coverage is undecided; add here when that's chosen.

## Branch/PR conventions
Same as the consumer app repo: branch per story, PR to `main`, self-reviewed before merge.

**Direct-to-main exception for docs-only changes (explicit policy as of 2026-08-17):** `PROGRESS.md`, `CLAUDE.md`, `docs/**`, and `README.md` — pure documentation/process, never executed — may be pushed straight to `main`, no branch/PR required. Nothing else qualifies, even for a "tiny" change: `src/**`, `supabase/migrations/**`, `package.json`/`package-lock.json`, and `.github/workflows/**` always require a real branch + PR + passing CI.

This exists because `main` now has genuinely enforced branch protection (two active rulesets — `main-1` blocks deletion/force-push, `main-2` requires the `ci` status check to pass before merge). Repo-owner bypass on a GitHub ruleset applies universally, with no way to scope it by file path — so this boundary is a deliberate, scoped exception to that enforcement, written down so it stays a decision, not a gap nobody chose.
