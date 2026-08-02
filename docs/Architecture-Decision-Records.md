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
