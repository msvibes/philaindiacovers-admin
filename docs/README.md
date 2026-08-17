# PhilaIndiaCovers — Documentation Index

Start here. This tells you which document to open based on what you're actually trying to do — not a list to read top to bottom.

> **Scope note (added when this index was copied into the `philaindiacovers-admin` repo):** this index was written for the full `PhilaIndiaCovers-Full-Documentation-Package`, which covers more than what lives in this repo's `docs/` folder. Only the subset actually relevant to engineering work here has been copied in. Each entry below is marked **✅ in this repo's `docs/`** or **📦 part of the full package, not copied here** so it's clear what you can actually open locally versus what exists only in the broader package.

## "I want the full picture, business and technical"
→ **`PRD-v1.0.md`** ✅ — the main Product Requirements Document. Problem, goals, requirements, scope, everything. Start here if you're new to the project entirely.

## "I want to understand how the system is architected, visually"
→ **`High-Level-Design.md`** ✅ — context diagram, container diagram, entity relationships, the verification-status state machine, the security trust-boundary diagram, key sequence flows. Best for a technical walkthrough or architecture review conversation.

## "Why did we choose Electron / Supabase / two repos / Microsoft Store / this specific security pattern?"
→ **`Architecture-Decision-Records.md`** ✅ — seven short records (Context → Decision → Consequences) covering every major technical call, with the tradeoffs we knowingly accepted written down, not just the decision itself.

## "I'm about to actually build something — what's the detailed design?"
→ **`Low-Level-Design.md`** ✅ — **stale, not current**: only covers T-01 (as-built) and T-02 (as-built, with one correction) in any real detail; T-03 through T-09 are all still marked "not yet built — forward design," even though all nine Walking Skeleton tasks are now actually complete. Never extended past its initial draft despite its own stated intent to grow task-by-task. Treat it as historical/planning-stage for anything past T-02, not as a record of what actually shipped — check the real code, or the relevant task's `AI-Agent-Implementation-Brief.md` row, instead.

## "Is this secure? What have we thought about?"
→ **`Threat-Model.md`** ✅ — a lightweight STRIDE-based review, scoped honestly to a ~100-user niche app rather than enterprise paranoia. Kept current as mitigations actually ship (e.g. CSV-injection moved from "open" to "resolved" once T-02 shipped it; the service-role-key guardrail moved from "open" to "partially resolved" once T-03 shipped it).

## "How do we know this actually works, and stays working?"
→ **`Test-Strategy.md`** ✅ — the testing pyramid (unit/integration/E2E), what's automated today vs. still manual, and the CI gate plan.

## "What exactly does the database look like?"
→ **`API-Integration-Contracts.md`** ✅ — full column-level schema, RLS policy design, and the custom functions (like `verify_cover()`) that enforce the security model.

## "What's the actual backlog, and why is it organized this way?"
→ **`Epics-UserStoryMap.md`** ✅ — all 11 Epics and 42 User Stories, built with Jeff Patton's Story Mapping method, plus the release-slicing logic (Walking Skeleton first, then the rest).

## "I'm Claude Code, starting a session — what do I need to know?"
→ **`AI-Agent-Implementation-Brief.md`** ✅ for repo conventions and task-decomposition method. The companion **`ClaudeCode-Continuity-Playbook.md`** 📦 (the `/standup` and `/wrapup` system) isn't copied here as a document — its content already lives on directly as this repo's actual `.claude/skills/standup/SKILL.md` and `.claude/skills/wrapup/SKILL.md`, which is the real implementation rather than a doc describing one.

## "What's the official list of India Post postal circles?"
→ **`Postal-Circles-Reference.md`** ✅ — the 23 official circles, verified against India Post's own site, with the two naming quirks ("Orissa," "North Eastern") called out explicitly so they don't get "corrected" by mistake.

## "I'm evaluating this as a potential investor or supporter"
→ **`Investor-PRFAQ.md`** 📦 — an honest press-release-and-FAQ format (Amazon's "Working Backwards" method), including the real, hard questions (what has to be true, top reasons this might not work) — written to inform a real decision, not to sell.

## "I'm a collector, just tell me what this app does"
→ **`About-EndUsers.md`** 📦 — plain-language, no architecture, no jargon. This is the only document in the set meant for the actual end-user audience.

## "I'm new to some of these engineering concepts — is that OK?"
Yes — look for **📚 Learning Note** callouts throughout the HLD, ADRs, and Threat Model. They explain real, named industry concepts (the C4 model, trust boundaries, state machines, `SECURITY DEFINER` functions, STRIDE) inline, right where they're used, rather than assuming prior knowledge. Skip them if you already know the concept — they're written to be easy to skip, not mandatory reading.

---

## A Note on Keeping This Set Honest

Several of these documents (particularly the LLD and Threat Model) describe things that change as real code gets built — they are living documents tied to actual implementation state, not one-time artifacts written once and frozen. When a task moves from "planned" to "built," the relevant document should be updated to match reality, not left describing a plan that's since diverged from what actually shipped. This index itself should be the first stop for figuring out what needs updating when that happens — if you're not sure which document a change belongs in, it's listed above.

**`PRD-v1.0.md`, `High-Level-Design.md`, `Low-Level-Design.md`, and `Epics-UserStoryMap.md` were added to this repo on 2026-08-17 and are planning-stage documents — they predate T-04 onward (the LLD explicitly stops updating after T-02).** Accurate for design intent and the original plan, but not a record of everything actually built since; the Walking Skeleton (T-01–T-09) is now fully complete, which none of these four reflect. Corroborate against the real code, `docs/API-Integration-Contracts.md`, and `docs/AI-Agent-Implementation-Brief.md`'s task table for current state, not these four alone. (These same four files, byte-identical, already exist in the App repo's own `docs/` — added there on 2026-08-16, one day before this repo's copy.)
