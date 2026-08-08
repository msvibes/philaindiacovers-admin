# PhilaIndiaCovers — Architecture Decision Records (ADRs)

Format follows Michael Nygard's widely-adopted ADR convention (used broadly across the industry, including at companies like Spotify and Amazon): each record is short, immutable once accepted, and captures *why*, not just *what* — so a future session (yours or Claude Code's) never has to guess whether a past decision was an oversight or a deliberate tradeoff.

**Relationship to the PRD:** §8.2 of the main PRD (`PhilaIndiaCovers-PRD-v1.0.md`) has a short "Alternatives Considered" table covering the same decisions at a glance. That table is the quick summary; this document is the full reasoning behind each row. Read §8.2 first for the two-second version, come here for the actual *why*.

---

## ADR-001: Electron for the v1 Windows Desktop Client

**Status:** Accepted

**Context:** v1 targets Windows desktop first, with Android and iOS as separate later phases. Flutter and .NET MAUI both offer a single codebase spanning all three eventual platforms.

**Decision:** Build v1 in Electron, accepting a full rebuild for Android/iOS later rather than a shared-codebase framework now.

**Consequences:** Fastest possible v1 build, using the stack Claude Code has the deepest familiarity with. The real cost: mobile phases will be a genuine second (and third) build, not an extension — mitigated by designing the backend API frontend-agnostically from day one, so only the client layer gets rebuilt.

---

## ADR-002: Supabase Over Firebase for the Backend

**Status:** Accepted

**Context:** Needed a managed backend covering database, auth, and file storage without standing up custom infrastructure. Firebase and Supabase were the two realistic managed options.

**Decision:** Supabase (Postgres + Auth + Storage).

**Consequences:** The catalogue/collection data is genuinely relational (users → collections → covers, with joins needed for the success metrics themselves) — Postgres fits this better than Firebase's NoSQL model. Real tradeoff accepted: Supabase's offline-first/mobile SDK bundle is weaker than Firebase's, which will matter more once the Android/iOS phase starts (ADR-001's cost, compounding here) — acceptable for now since v1's offline need is read-mostly, single-writer browsing, not real-time multi-device sync.

---

## ADR-003: Two Separate Repos, Not a Monorepo

**Status:** Accepted

**Context:** The Electron consumer app and the Next.js admin back-office are genuinely different applications with different audiences, sharing only a backend and a generated types file.

**Decision:** `philaindiacovers-app` and `philaindiacovers-admin` as two independent GitHub repos.

**Consequences:** Smaller, more focused context per repo — genuinely beneficial for an AI-agent-built project, since Claude Code works within one coherent codebase shape at a time rather than navigating two tangled ones. Real cost accepted: Supabase-generated TypeScript types must be regenerated and copied into both repos whenever the schema changes — a manual but simple step, not an ongoing burden at this schema's size.

---

## ADR-004: Microsoft Store as Primary Distribution Channel

**Status:** Accepted (supersedes an earlier direct-download-only plan)

**Context:** A direct-download Windows installer triggers "unknown publisher" SmartScreen warnings without a paid code-signing certificate (~$195+/year), undermining the trust the whole product depends on.

**Decision:** Distribute via the Microsoft Store as the primary channel (free for individual developers since Sept 2025, code signing handled automatically), with GitHub Releases as a secondary mirror.

**Consequences:** Zero-cost, zero-warning distribution. Real cost accepted: the Electron app must be packaged as MSIX, a build step not otherwise required.

---

## ADR-005: `verify_cover()` Function Instead of Direct Table Grants for the Verifier Role

**Status:** Accepted

> 📚 **Learning note:** a `SECURITY DEFINER` function in Postgres runs with the *permissions of whoever created it*, not the permissions of whoever calls it — the opposite of how database access normally works. This is what makes the pattern below possible: a Verifier can be given zero direct table access at all, yet still perform one very specific, tightly-controlled action through a function that's allowed to do more than they are individually. It's a common technique wherever you need "this role can do exactly this one privileged thing, and nothing else" — worth recognizing if you see it in other systems.

**Context:** FR-25 requires that a Verifier can change a cover's status but never edit its metadata, enforced at the database level. Postgres Row-Level Security is row-level, not column-level, so it cannot natively express "this role may write this column but not that one" on the same table.

**Decision:** The Verifier role gets no direct write grant on `covers` at all. All verification actions go through a single `SECURITY DEFINER` function, `verify_cover()`, which performs exactly the allowed update and writes the audit log atomically.

**Consequences:** A genuine, code-level guarantee that a UI restriction alone could never provide — even a compromised or buggy Admin UI cannot let a Verifier account edit metadata directly, because the database itself has no path for it. The cost: any future legitimate Verifier action must be added to this function explicitly, rather than being a simple table grant — an intentional friction, not an oversight.

---

## ADR-006: GitHub Actions for CI/CD

**Status:** Accepted

**Context:** Needed automated lint/typecheck/test gates before merge, plus a release build pipeline for the Electron app, without adding a new tool/vendor to the stack.

**Decision:** GitHub Actions, native to the already-chosen repo host.

**Consequences:** Zero new signup, generous free tier at this project's scale, and it scales cleanly later (more platforms, more automation) without switching tools.

---

## ADR-007: "Enable Automatic RLS" Checked Project-Wide at Supabase Project Creation

**Status:** Accepted

**Context:** By default, Supabase's Data API can expose any table with a base GRANT to `anon`/`authenticated`, whether or not Row-Level Security is enabled on it — a newly created table with no explicit `ENABLE ROW LEVEL SECURITY` statement (easy to forget mid-iteration on a schema) is fully readable/writable by anyone holding the right key, not filtered at all, until someone remembers to lock it down.

**Decision:** "Enable automatic RLS" was checked at project creation, alongside "Automatically expose new tables" being deliberately unchecked (see the grant-related notes in `.claude/PROGRESS.md` and the T-03/T-04 migration comments). Every new table in this project gets RLS enabled by default the moment it's created, regardless of whether it's created via the dashboard, the CLI, or a raw SQL migration.

This setting lived only in the original project-setup conversation and was never written down anywhere in `docs/` — it had to be reconstructed empirically during T-04 by querying `pg_class.relrowsecurity` and finding it `true` on `profiles` and `postal_circles`, neither of which any migration ever explicitly enabled RLS on. This ADR exists so a future session can just read this instead of re-deriving it from migration forensics.

**Consequences:** A new table with zero RLS policies defaults to deny-all for every non-owner role — safe by construction, not by discipline. Combined with "Automatically expose new tables" being off, this project's default posture for any new table is: no grants, no access, until both are explicitly added — deliberately locked-down-by-default, at the cost of needing explicit setup (grant + policies) for every table rather than either half working automatically. This is what makes a blanket `ALTER DEFAULT PRIVILEGES ... TO authenticated` (T-04) safe to set up ahead of time for all future tables, the same way T-03's fix already did for `service_role`: the grant alone never bypasses RLS, so `collection_items`, `wishlist_items`, `verification_audit_log`, and anything created later will be both grant-covered and RLS-locked-down the moment they exist, not wide open until their own task remembers to enable RLS. Any future Supabase project for this product (e.g. the eventual production project, per the Environment-separation plan) must have this same setting checked at creation — it isn't something a migration can retroactively enable for a project that started without it.

**Addendum, found while verifying this ADR's own premise (2026-08-04):** "Automatically expose new tables" being off only suppresses the CRUD privileges (SELECT/INSERT/UPDATE/DELETE) from the project's baseline default grant to `anon`/`authenticated` — it does **not** suppress TRUNCATE, REFERENCES, TRIGGER, or MAINTAIN, which both roles had by default on every table (`covers`, `profiles`, `postal_circles`) independent of anything any migration asked for. TRUNCATE does not evaluate RLS at all in Postgres, so this meant the fully public `anon` key could truncate any of these tables regardless of RLS policy — a real, live gap, not a theoretical one. Fixed by explicit `REVOKE` on the existing tables and on the default ACL going forward (`20260804180223_revoke_rls_bypassing_privileges.sql`, `20260804180432_revoke_maintain_privilege.sql`). Worth checking for on any future Supabase project created the same way — the checkbox handles RLS-enablement and CRUD-grant-suppression, but evidently not these four privilege types, at least as this project's baseline was provisioned.

---

## ADR-008: Bearer-Token Session Verification for Route Handlers, Not Cookie-Based `@supabase/ssr`

**Status:** Accepted

**Context:** T-06.5 needed to close the access-control gap on `/api/check-duplicate-covers` and `/api/confirm-import` (open since T-03/T-05) by requiring a verified session, and to build the back-office's first login UI. No ADR or doc had settled how a Next.js Route Handler should verify a caller's identity — this was an open design gap. The two realistic options: (1) cookie-based sessions via `@supabase/ssr`, the officially-recommended Next.js+Supabase pattern, which also sets up page-level/middleware protection for free later; or (2) the browser's already-installed `@supabase/supabase-js` client (localStorage session) attaching `Authorization: Bearer <access_token>` on every call to these two routes, verified server-side via `supabase.auth.getUser(token)`.

**Decision:** Bearer token, not `@supabase/ssr`. Both routes are called via `fetch()` from client-side code (not Server Components), so there was no page-rendering use case forcing the cookie approach. `getUser(token)` performs a real round-trip to Supabase Auth to validate the token — not a locally-decoded, trustable-as-a-client-claim JWT — so the security property is identical either way.

**Consequences:** Zero new dependency (`@supabase/ssr` was never added). Integration tests stay simple and reliable — a bearer token is just a header string, unlike `@supabase/ssr`'s chunked/base64 cookie format, which is fiddlier and more version-sensitive to fabricate correctly inside an in-process test (this repo's established style since T-04/T-06, importing the Route Handler directly rather than running a real server). Real cost accepted: this decision doesn't give page-level route protection (e.g. redirecting an unauthenticated visitor away from `/import`) for free the way middleware would. T-06.5 deliberately scoped to enforcing access only at the two API routes — where the actual data/write risk lives — rather than also building a page-level guard, matching its own Non-Goals framing of "exactly what's needed to close the gap, not a full auth feature set." If a future task needs real page-level gating (e.g. a Server-Component-rendered Verifier review screen in T-07), that will need its own decision — likely `@supabase/ssr` at that point, added then rather than now.
