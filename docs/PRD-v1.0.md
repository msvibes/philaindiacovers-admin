# PhilaIndiaCovers — Product Requirements Document

## 0. Document Control

| Field              | Value                                                                                                                                                                                                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Product Name**   | PhilaIndiaCovers                                                                                                                                                                                                                                                                                                                                        |
| **PRD Type**       | Product-level (new product)                                                                                                                                                                                                                                                                                                                             |
| **PRD Owner**      | Manjunath Shanmugam                                                                                                                                                                                                                                                                                                                                     |
| **Status**         | Draft — pending external philatelist domain-accuracy review before final sign-off                                                                                                                                                                                                                                                                       |
| **Version**        | v1.0                                                                                                                                                                                                                                                                                                                                                    |
| **Target Release** | v1 — Windows Desktop                                                                                                                                                                                                                                                                                                                                    |
| **Linked Docs**    | `PhilaIndiaCovers-Epics-UserStoryMap.md` (full Epics/User Stories), `PhilaIndiaCovers-API-Integration-Contracts.md` (full schema detail), `PhilaIndiaCovers-AI-Agent-Implementation-Brief.md` (full agent-execution detail), `PhilaIndiaCovers-ClaudeCode-Continuity-Playbook.md` (session-continuity system), Jira project **KAN** (all Epics/Stories) |

---

## 1. Executive Summary

**What:** A Windows desktop application — a catalogue and personal collection manager for Indian GI Tag Special Covers — with Android and iOS versions to follow as separate, later phases.

**For whom:** Philatelists and collectors of Indian GI Tag Special Covers, and philately vendors/dealers.

**Why now:** GI Tag Special Cover releases expanded sharply from 2021 onward, growing to 300+ unique items (community-tracked) by 2024 and continuing through 2026 — but no unified, reliable catalogue has kept pace.

**Expected impact:** Quantified in §3.4 — a complete, SME-verified reference catalogue and meaningful early adoption among the niche collector community that validated this need.

---

## 2. Problem Statement & Background

### 2.1 Problem

Collectors of Indian GI Tag Special Covers have no authoritative electronic catalogue to reference, and no electronic way to track or manage their own holdings. Today they organize covers using generic, non-purpose-built physical albums — there is no pre-printed album designed for this niche — supplemented by informally compiled, incomplete lists circulated in WhatsApp groups. There is no comprehensive, reliable single source of truth for what's been issued, when, or by which postal circle.

### 2.2 Evidence

- **First-hand and community-sourced:** validated by the PRD owner's own experience as an active philatelist/collector, corroborated independently by a fellow collector/dealer.
- **Current workarounds observed:** generic physical albums adapted for this purpose, plus informal, incomplete WhatsApp-circulated lists — no comprehensive catalogue, reference book, or purpose-built album exists today.
- **Volume trend (community-tracked, not an official India Post statistic):** GI Tag Special Cover releases were sporadic and uncoordinated before 2021. India Post's 2021 nationwide rollout (tied to Azadi Ka Amrit Mahotsav) produced the largest single-year volume on record, and releases have continued at a steady pace since — reaching over 300 unique GI items by late 2024, with new covers still being issued through 2026.

### 2.3 Why Now

The combination of a philatelist/dealer-confirmed real gap, a sharply rising and continuing volume of releases since 2021 that existing informal tracking can't keep up with, and the PRD owner's personal motivation and professional (IT) capability to build and deploy a real production app makes this the right time to build rather than defer.

### 2.4 Cost of Inaction

If this isn't built, collectors continue adapting generic albums and relying on fragmented WhatsApp lists as the backlog of GI Tag covers keeps growing, making it progressively harder for any collector to know what exists, what they're missing, or what's authentic — with no purpose-built tool, physical or electronic, filling that gap.

---

## 3. Goals, Non-Goals & Success Metrics

### 3.1 Goals

1. Establish a complete, SME-verified catalogue of all Indian GI Tag Special Covers issued through June 30, 2026, replacing generic albums and informal WhatsApp lists as the collector community's primary reference.
2. Achieve meaningful early adoption within the niche collector community as validation of real demand for a purpose-built digital catalogue.
3. Enable collectors to begin actively managing their personal holdings digitally, moving usage beyond passive browsing into real collection tracking.

### 3.2 Non-Goals

- Android app, iOS app, web app — each a separately-decided later phase.
- Vendor-specific capabilities (listing covers for sale, dealer badges) — vendors browse like collectors in v1.
- Apple SSO, for both the consumer app and the back-office — requires a $99/year Apple Developer Program membership; revisit once real user demand justifies the ongoing cost.
- Push notifications, crash reporting, offline write-sync/conflict resolution — v1 offline support is read-only browsing of previously-synced data only.
- Feature flags / staged rollout tooling — not warranted at this scale.
- Multiple named collections per user — a single collection (supporting multiple entries per cover) covers v1; true multi-collection organization is a v2, usage-driven decision.

### 3.3 Product Principles

1. **Verified beats fast** — no entry is real until the SME confirms it; never trade catalogue accuracy for speed of listing, even under launch pressure.
2. **Built by a collector, for collectors** — feature and design decisions favor what a serious philatelist actually needs over generic app conventions.
3. **The catalogue is the product** — Collection Manager, Wish List, and any future capability support the catalogue; they never come at the cost of its completeness or quality.
4. **Simple and fast beats feature-rich** — a clean, quick experience wins over accumulating features.

### 3.4 Success Metrics

| Metric                     | Type                | Baseline | Target                                                                | Measurement Method                                               | Owner                  |
| -------------------------- | ------------------- | -------- | --------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------- |
| Catalogue completeness     | Launch-gate / Input | 0%       | 100% of GI Tag Special Covers issued through June 30, 2026 catalogued | Catalogue entry count reconciled against SME's physical holdings | PRD owner + SME dealer |
| Catalogue accuracy         | Guardrail           | N/A      | 100% of catalogued entries verified accurate                          | Manual entry-by-entry SME sign-off via the Admin Tool            | SME dealer             |
| Registered users           | Input / Adoption    | 0        | 100 registered users, 3 months post-launch                            | App signup count                                                 | PRD owner              |
| Collection activation rate | **North Star**      | 0%       | ≥50% of registered users have created ≥1 collection entry             | Users with ≥1 Collection entry ÷ total registered users          | PRD owner              |

- **North Star:** Collection activation rate — registration alone is a vanity signal; this is the first metric that shows real usage, not just trial.
- **Guardrail:** Catalogue accuracy must hold at 100% on an ongoing basis as new covers are added post-launch, not just at the initial verification pass.
- **Leading indicators:** weekly signup trend; organic mentions/shares in the collector WhatsApp groups already engaged with this problem.
- **Qualitative signals:** direct feedback from the fellow collector/dealer who originally confirmed the need, and reactions in the community groups once launched.

### 3.5 Success Criteria for Launch (Go/No-Go)

- [ ] 100% of GI Tag Special Covers issued through June 30, 2026 are catalogued
- [ ] Full catalogue manually verified for accuracy by the named SME dealer, with sign-off
- [ ] Core MVP features (auth, catalogue browse/search/filter, cover detail view, Collection Manager, Wish List) functional end-to-end

---

## 4. Users, Personas & Jobs-to-Be-Done

### 4.1 Primary Personas

| Persona                         | Context / Environment                          | Goal (JTBD)                                                                                                                                                                                                  | Current Pain                                                                    | Technical Sophistication                                                                                                           |
| ------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Collector**                   | Windows desktop, varying comfort with software | When I want to track and grow my GI Tag Special Cover collection, I want a trustworthy, purpose-built catalogue and collection manager, so I can stop relying on generic albums and scattered WhatsApp lists | No authoritative reference exists; no electronic way to track personal holdings | Varies — from experienced digital users to collectors newer to apps generally, hence in-app tooltips and explainers (FR-38, FR-39) |
| **Vendor/Dealer**               | Same consumer app, browsing only in v1         | Reference the same authoritative catalogue as collectors do                                                                                                                                                  | Same lack of an authoritative reference                                         | Varies, same as Collector                                                                                                          |
| **Admin** (PRD owner)           | Internal web back-office                       | Get the catalogue populated accurately and efficiently, both the initial backlog and ongoing new releases                                                                                                    | No purpose-built tool for bulk cataloguing GI covers                            | High — the PRD owner/developer                                                                                                     |
| **Verifier** (named SME dealer) | Internal web back-office                       | Confirm catalogue entries are accurate against physical holdings, without needing deep technical skill                                                                                                       | No structured review workflow exists today                                      | Domain expert, not necessarily technical — hence a simple, focused review queue rather than a general-purpose admin tool           |

### 4.2 User Segments Explicitly Out of Scope

Android/iOS users (later phase), unauthenticated/anonymous browsing (an account is required to use the app), vendors seeking selling/listing capability (v1 is browsing-only for this persona).

### 4.3 Journey / Key Use Cases

**Collector journey:** discovers the app via the philately WhatsApp community or the indphila.com landing page → downloads via the Microsoft Store → signs up (optionally completing the guided walkthrough) → browses/searches/filters the catalogue → adds owned covers to their Collection with personal details → tracks wanted covers on their Wish List, prioritized → periodically checks completeness/spend via Reports.

**Admin/Verifier journey:** Admin bulk-imports the initial catalogue backlog from a spreadsheet and matching images → Verifier reviews each Draft entry against physical holdings, marking Verified or Flagged with a reason → flagged entries return to the Admin for correction and re-enter the review queue → once live, new covers are added incrementally the same way as they're issued.

---

## 5. Scope

### 5.1 In Scope

- Windows Desktop application (Electron) — v1 client for collectors
- Catalogue: browse, search, filter, cover detail view
- Collection Manager (supporting multiple entries per cover)
- Wish List
- Consumer auth: email/password + Google SSO, with automatic account linking across methods sharing an email
- Internal web back-office (Next.js, hosted on Vercel): bulk import, individual cover edit, SME verification workflow, audit trail
- Back-office auth: email/password + Google SSO
- Backend: Supabase Cloud (Postgres + Auth + Storage), AWS Mumbai region
- Privacy Notice and consent at signup (FR-43)
- Distribution via Microsoft Store, mirrored on GitHub Releases

### 5.2 Out of Scope

See §3.2 Non-Goals.

### 5.3 Assumptions & Constraints

- **Technical:** Electron for the Windows client; two separate Supabase projects (Free for development, Pro for production); solo/indie budget (~$0 during build, ~$25–35/month at launch for Supabase Pro).
- **Business:** solo/indie build via Claude Code; no PMO or compliance overhead beyond what's genuinely required (see FR-43).
- **Assumptions that would invalidate parts of this PRD if wrong:**
  - The community-tracked figure of 300+ GI Tag covers issued through June 30, 2026 is roughly accurate — a significantly different real count would require revisiting the "100% catalogued" launch criterion.
  - The named SME dealer remains available and willing to verify all entries — if not, the verification method behind the accuracy metric needs a fallback.
  - `indphila.com` (a third-party domain the PRD owner has direct publishing access to) remains available for the landing page.

### 5.4 Dependencies

| Dependency                                                | Type               | Owner                                    | Status                 | Risk if Delayed                                                                                                                                                  |
| --------------------------------------------------------- | ------------------ | ---------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Final metadata schema validation against real sample data | Data               | PRD owner                                | Complete               | —                                                                                                                                                                |
| SME dealer's ongoing availability for verification        | Third-party/Person | PRD owner                                | Confirmed in principle | Blocks the 100%-verified launch criterion                                                                                                                        |
| Supabase project setup (Mumbai region)                    | Service            | PRD owner                                | Not yet started        | Blocks all backend-dependent development; note reported intermittent capacity constraints in this region — check status.supabase.com before creating the project |
| `indphila.com` landing page access                        | Third-party        | PRD owner (has direct publishing access) | Confirmed              | Low risk — PRD owner controls publishing directly despite third-party domain ownership                                                                           |

---

## 6. Requirements

### 6.1 Functional Requirements

**Catalogue**

| ID    | Requirement                                                                                                                                                                                    | Priority |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-01 | Display all Verified covers in a browsable list: thumbnail, GI Product/Item Name, Product Category, Issuing Postal Circle, Date of Issue                                                       | P0       |
| FR-02 | Filter the catalogue by Postal Circle, Product Category, and Date of Issue (year/range)                                                                                                        | P0       |
| FR-03 | Full-text search across GI Product/Item Name, Name of the Cover, and Overall Description (deliberately separate from FR-02: filter operates on structured/bounded values, search on free text) | P0       |
| FR-04 | Sort by Date of Issue (default, most recent first) or alphabetically by GI Item Name                                                                                                           | P1       |
| FR-05 | Full cover detail view on selection: Name of Cover, GI Registration Number, Cancellation description, Cachet description, Overall Description, Place of Issue, full-size image                 | P0       |
| FR-18 | Visual "New" indicator on catalogue entries added since the collector's last visit                                                                                                             | P2       |

**Collection Manager** (single collection per user, supporting multiple entries against the same cover)

| ID    | Requirement                                                                                                                                                                                                                                                                                              | Priority |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-06 | Add one or more entries for the same cover to the Collection, each capturing: acquisition date, condition (Superb/XF, Very Fine, Fine, Good/Average), postal usage (addressed-only vs. genuinely used), acquisition method (Purchased / Gifted / Inherited / Traded / Other), price paid, personal notes | P0       |
| FR-07 | View full Collection as a list, with personal details shown alongside each entry                                                                                                                                                                                                                         | P0       |
| FR-08 | Edit personal details of an existing Collection entry                                                                                                                                                                                                                                                    | P1       |
| FR-09 | Remove a cover from the Collection (catalogue entry itself unaffected)                                                                                                                                                                                                                                   | P1       |
| FR-16 | Block Collection add-or-edit actions while offline, with a clear inline message — deliberate choice, not offline write-queueing                                                                                                                                                                          | P0       |
| FR-19 | Search/filter within My Collection, same fields as the main catalogue                                                                                                                                                                                                                                    | P2       |

**Wish List** (independent from Collection — no auto-removal on purchase)

| ID                | Requirement                                                                                                                            | Priority |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-10             | Add a cover to the Wish List with personal notes and a priority level                                                                  | P0       |
| FR-11             | View Wish List, sortable by priority. Priority scale: **Holy Grail → Hunting Hard → Would Be Thrilled → Nice to Add → Someday, Maybe** | P1       |
| FR-12             | Edit or remove a Wish List entry                                                                                                       | P1       |
| FR-16 (Wish List) | Block Wish List add-or-edit actions while offline, with a clear inline message                                                         | P0       |
| FR-19 (Wish List) | Search/filter within My Wish List, same fields as the main catalogue                                                                   | P2       |

**Reports**

| ID    | Requirement                                                                                                                                                 | Priority |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-13 | Show % of Verified catalogue owned, based on Collection                                                                                                     | P1       |
| FR-14 | List Verified covers NOT in the collector's Collection (distinct from the manually-curated Wish List)                                                       | P1       |
| FR-15 | Show total spent on Purchased covers only, plus a separate count of Gifted/Inherited/Traded/Other covers — deliberately not blended into one misleading sum | P2       |
| —     | Back-office Dashboard extended to also show registered-user count and Collection-activation-rate, doubling as the live view against §3.4 Success Metrics    | P1       |

**Admin Module**

| ID    | Requirement                                                                                                                                                            | Priority |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-17 | Bulk import flags any row whose GI Item + Date of Issue matches an existing catalogue entry (any status) as a likely duplicate, for manual confirmation                | P0       |
| FR-20 | Bulk import via spreadsheet + images, validating every referenced filename exists and flagging duplicates before creating any entries; preview shown before confirming | P0       |
| FR-21 | Add/edit a single cover directly, outside bulk import — the ongoing path for new covers post-launch                                                                    | P0       |
| FR-22 | Verifier reviews Draft/re-submitted-Flagged entries, marks Verified or Flagged-with-reason; only Verified is visible in the consumer catalogue                         | P0       |
| FR-23 | Every verification action logged in an audit trail (who, what, when, reason), viewable by the Admin                                                                    | P0       |
| FR-24 | A corrected Flagged entry returns to the review queue — the Admin cannot self-mark it Verified, only the Verifier can                                                  | P0       |
| FR-25 | Admin-vs-Verifier permissions enforced via database row-level security, not UI-only                                                                                    | P0       |

_(A cover reverted from Verified after going live is corrected directly by the Admin while it stays Verified — no formal re-flag/un-publish workflow for v1, consistent with the "simple beats feature-rich" principle.)_

**Auth — Consumer App**

| ID    | Requirement                                                                                                                                                                                                                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-26 | Sign up via email/password or Google SSO. If the email is already associated with an existing account via a different method, the new method is automatically linked to that same account rather than creating a duplicate — safe because every method already verifies real ownership of the email | P0       |
| FR-27 | Email/password signups require email verification before the account can be used                                                                                                                                                                                                                    | P0       |
| FR-28 | Log in via any method associated with the account. The first time a new method is used on an existing account, show a clear message rather than linking silently                                                                                                                                    | P0       |
| FR-29 | Password reset ("forgot password") flow for email/password accounts                                                                                                                                                                                                                                 | P0       |
| FR-30 | Log out                                                                                                                                                                                                                                                                                             | P0       |
| FR-31 | Self-service account deletion, removing the account and its Collection/Wish List data                                                                                                                                                                                                               | P1       |

**Auth — Admin Back-Office**

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-32 | Sign up/log in via email/password or Google SSO only (no Apple SSO — 2 known internal users) | P0       |

**Settings/Profile**

| ID    | Requirement                                    | Priority |
| ----- | ---------------------------------------------- | -------- |
| FR-33 | View and edit basic profile info (name, email) | P1       |
| FR-34 | Change password (email/password accounts only) | P1       |
| FR-35 | Access account deletion (FR-31) from Settings  | P1       |
| FR-36 | Minimal Support section with a contact link    | P2       |

**Help & Onboarding**

| ID    | Requirement                                                                                                      | Priority |
| ----- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| FR-37 | Optional, skippable guided walkthrough on first login                                                            | P1       |
| FR-38 | Hover tooltips on non-obvious UI elements (e.g. Wish List priority tier names, filter/sort icons)                | P1       |
| FR-39 | Inline "what's this?" explainer for philatelic terminology fields (Cachet, Cancellation, GI Registration Number) | P2       |
| FR-40 | Minimal in-app Help/FAQ, accessible from Settings                                                                | P2       |

**Compliance**

| ID    | Requirement                                                                                                                                                                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-43 | Present a plain-language Privacy Notice with an explicit consent checkbox at signup — stating what's collected, why, retention, and how to exercise rights — before an account can be created. Paired with a static Privacy Policy page on the indphila.com landing site | P0       |

### 6.2 Non-Functional Requirements

| Category    | Requirement            | Target                                                            | Evidence Basis                                                                               |
| ----------- | ---------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Performance | Search/filter response | < 1 second                                                        | Nielsen usability-response-time research (a general HCI baseline, not user-specific testing) |
| Performance | App cold-start         | < 3 seconds on typical hardware                                   | Same as above                                                                                |
| Reliability | Offline access         | Previously-synced catalogue/collection browsable without internet | Patchy connectivity outside major metros                                                     |
| Reliability | Sync recovery          | No data loss on reconnect after failed sync; automatic retry      | Standard practice                                                                            |

### 6.3 Data Requirements

Finalized against a real sample (a 293-row metadata spreadsheet and one matching cover image, "Adamchini Chawal (Rice), Chandauli," cross-verified against each other).

| Field                       | Notes                                                                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Cover ID                    | System-generated                                                                                                                               |
| Image file                  | One image per cover                                                                                                                            |
| Name of the Cover           | The release/exhibition/series title — can differ from the GI item name (e.g. multiple items sharing one series name like "Pride of Rajasthan") |
| Name of the GI Tag / Item   | —                                                                                                                                              |
| GI Registration Number      | Extracted into its own field where present in source text                                                                                      |
| Product Category            | Free text, not validated against a fixed list (the official 6-category GI Registry scheme was used as a reference point, not enforced)         |
| Description of Cancellation | What the postmark design depicts                                                                                                               |
| Description of Cachet       | What the printed illustration on the cover depicts                                                                                             |
| Overall Description         | One-line summary                                                                                                                               |
| Issuing Postal Circle       | Normalized against the 23 official India Post circles (see Appendix)                                                                           |
| Place of Issue              | —                                                                                                                                              |
| Date of Issue               | Parser handles mixed source formats (real dates and text strings)                                                                              |
| Verification Status         | Draft / Verified / Flagged                                                                                                                     |
| Verified By + Date          | Audit trail                                                                                                                                    |

**Bulk-import validation:** skip blank rows automatically; parse dates in multiple formats and flag anything unparseable; map postal-circle text to the 23 official circles via lookup, flagging unmatched values for manual resolution; extract GI registration numbers from item-name text where a recognizable pattern is present; validate every referenced image filename exists before creating any entries, with a preview of failures shown first; flag likely duplicates by matching GI Item + Date of Issue against existing entries of any status.

### 6.4 API / Integration Contracts

Since the backend is Supabase, this isn't a hand-designed REST API spec — Supabase's PostgREST layer auto-generates REST endpoints directly from the database schema, with access controlled by Row-Level Security rather than application code. Full detail (complete column-level schema for all five tables, the full RLS policy matrix, and third-party integration notes) lives in `PhilaIndiaCovers-API-Integration-Contracts.md`. Summary:

**Core tables:** `profiles`, `postal_circles` (reference/lookup, seeded with the 23 official circles), `covers` (the shared catalogue), `collection_items`, `wishlist_items`, `verification_audit_log`.

**Row-level security, by role:** Collectors read only Verified covers and read/write only their own Collection/Wish List rows. Admins have full read/write on covers. Verifiers can read Draft/Flagged covers but have **no direct write access** — they can only call a dedicated `verify_cover()` function, since Postgres RLS is row-level, not column-level, and can't otherwise restrict a Verifier to changing status without also allowing metadata edits. This is what actually satisfies FR-25's database-level enforcement requirement, not just a UI restriction.

**Custom functions beyond simple CRUD:** `verify_cover()` (atomically updates status, verified-by, and writes the audit log in one transaction); the bulk-import Edge Function (filename validation, duplicate detection, Draft-entry creation); lightweight views for collector stats (completeness %, missing-covers list, spend) and dashboard stats.

**Third-party integrations:** Google OAuth via Supabase Auth (email/password remains a fallback if Google's service is briefly unavailable); Supabase Storage for cover images (admin-only writes, public read for Verified covers only). **Implementation dependency to verify during build:** Supabase Auth's "Manual Linking" setting must be explicitly enabled and tested for FR-26's account-linking behavior to actually work — it is not the default.

---

## 7. UX / Design

**Design assets:** None exist yet — visual design is created directly during implementation rather than handed off from a separate design phase, appropriate for a solo build.

**Voice & Tone:** Playful and courteous throughout the entire consumer app — warm, a little fun, never flippant. The catalogue _data_ stays accurate and matter-of-fact; it's the app's surrounding voice that carries personality. The admin back-office stays neutral and functional — a two-person working tool, not consumer-facing.

**Key states, with example copy setting the tone:**

| State                           | Example                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------ |
| Empty Collection                | "Your collection's empty for now — go find your first cover in the catalogue." |
| Empty Wish List                 | "Nothing on your wish list yet. Every great collection starts with a want."    |
| Loading                         | Clean and simple, no jokes needed                                              |
| Error (e.g. sync failure)       | "Something didn't sync properly. Give it another go?"                          |
| Offline                         | "You're offline — browsing what's already saved. Reconnect to see the latest." |
| Success (e.g. cover added)      | "Added! One step closer to a complete collection."                             |
| Permission-denied (back-office) | Neutral/functional tone — not playful                                          |

**Copy requirement:** all consumer-facing UI text reads as if written by a fellow collector, not a corporate product team.

**Design review sign-off:** No separate design team — verification happens via the Human Review Checkpoints in §10.6, checked against this tone guidance.

---

## 8. Technical Considerations

### 8.1 Proposed Architecture

Electron desktop client (v1) + a separate Next.js admin back-office, hosted on Vercel + Supabase backend (Postgres, Auth, Storage), AWS Mumbai region, with row-level security enforcing the Admin/Verifier/Collector roles. Mobile client stack deliberately undecided, to be chosen fresh when that phase starts.

### 8.2 Alternatives Considered

_(Quick summary below — full reasoning for each decision, including consequences and tradeoffs accepted, lives in `PhilaIndiaCovers-Architecture-Decision-Records.md`.)_

| Layer        | Option                                      | Why Not Chosen                                                                                            |
| ------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Client stack | Flutter / .NET MAUI                         | Better long-term code reuse toward Android/iOS, but desktop-first priority favored Electron's build speed |
| Backend      | Firebase                                    | NoSQL model fights the relational shape of the catalogue/collections data                                 |
| Backend      | Custom Node/Express + self-managed Postgres | More control, but meaningfully more ops burden for a solo builder                                         |

### 8.3 Risks & Mitigations

| Risk                                                            | Mitigation                                                                                                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Electron choice means a full rebuild for Android/iOS later      | Backend API designed frontend-agnostic from day one, so only the client layer gets rebuilt                                                  |
| Supabase free-tier auto-pause hits before upgrade to Pro        | Move to Pro before public launch (already a launch-readiness item)                                                                          |
| No automated backups on Free tier                               | Scheduled manual backups while on Free; real backup retention after upgrading to Pro; periodic real restore-tests, not just "backups exist" |
| Supabase lacks built-in offline-first sync/conflict resolution  | Not needed — v1's offline requirement is single-writer, read-mostly browsing, covered by a simple local cache                               |
| Reported intermittent capacity constraints in the Mumbai region | Check status.supabase.com before creating the project; expect a possible retry                                                              |

### 8.4 Rollout Strategy

No feature-flag system — direct release once §3.5's launch criteria are met. Rollback via reverting to the previous installer build; database migrations kept additive/reversible where feasible. No kill switch — not warranted at this scale.

---

## 9. Agile / Scrum Execution Plan

Full detail — the complete Story Map backbone, INVEST notes, release slicing, and Jira export mapping — lives in `PhilaIndiaCovers-Epics-UserStoryMap.md`, built using Jeff Patton's User Story Mapping method with separate backbones for the Collector and Admin/Verifier personas. All 11 Epics and 42 User Stories are already imported into **Jira project KAN**, with Sprints/Backlog and Story Point estimation enabled. Sprint-by-sprint planning was explicitly declined by the PRD owner in favor of working directly from the prioritized Jira backlog.

### 9.1 Epics

| Epic                             | Persona        | Goal                                                                  | Linked FRs          |
| -------------------------------- | -------------- | --------------------------------------------------------------------- | ------------------- |
| Get Started                      | Collector      | Create an account, verify it, and understand the app before diving in | FR-26–30, 37        |
| Browse the Catalogue             | Collector      | Find and inspect any Verified cover                                   | FR-01–05, 18        |
| Build My Collection              | Collector      | Record and manage personal holdings                                   | FR-06–09, 16, 19    |
| Track My Wish List               | Collector      | Track and prioritize wanted covers                                    | FR-10–12, 16, 19    |
| See My Progress                  | Collector      | See completeness, gaps, and spend                                     | FR-13–15            |
| Get Help When Stuck              | Collector      | Get oriented without needing to ask a person                          | FR-38–40            |
| Manage My Account                | Collector      | Maintain and, if needed, leave the account                            | FR-31, 33–36        |
| Admin & Verifier Access          | Admin/Verifier | The right person can do the right things, enforced for real           | FR-25, 32           |
| Import & Maintain Catalogue Data | Admin          | The catalogue gets populated reliably, backlog and ongoing            | FR-17, 20, 21       |
| Verify Catalogue Accuracy        | Verifier/Admin | Nothing reaches collectors unverified, with a real trail              | FR-22–24            |
| Monitor Product Progress         | Admin          | One place to check progress against the actual success metrics        | Dashboard extension |

### 9.2 Release Slicing

**Walking Skeleton (build first):** bulk import → Verifier marks Verified → collector sees it in the catalogue list → collector opens full detail. This thin, deliberately internal-only slice proves the single highest-risk unknown — the entire data pipeline — before anything else gets built on top of it.

**Release 1:** every story tagged P0/P1 across all 11 Epics — the full locked v1 scope.

**Natural trim candidates if the schedule slips:** the "New" indicator, in-Collection/Wish-List search, the spend report, the inline term explainer, the in-app FAQ — all already P2, already in scope, but the first things to cut under real time pressure.

---

## 10. AI-Agent Implementation Brief

Purpose-built for Claude Code execution. Full detail lives in `PhilaIndiaCovers-AI-Agent-Implementation-Brief.md`; summary below.

### 10.1 Repo & Environment

Two separate GitHub repos — `philaindiacovers-app` (Electron consumer app) and `philaindiacovers-admin` (Next.js back-office) — deliberately kept separate for a more focused agent context per repo. Shared dependency: Supabase-generated TypeScript types, regenerated and copied into both repos whenever the schema changes. Trunk-based branching: `main` always deployable, one short-lived branch per story, merged via a self-reviewed PR.

### 10.2 Session Continuity

Full system in `PhilaIndiaCovers-ClaudeCode-Continuity-Playbook.md`. A `/standup` custom Claude Code command reconciles a lightweight `.claude/PROGRESS.md` file against actual Jira status and actual merged GitHub PRs at the start of every session — catching drift rather than trusting a manually-updated file blindly. A matching `/wrapup` command closes out each session properly.

### 10.3 Task Decomposition

Full task-level breakdown for all 42 stories deliberately isn't done upfront — task lists go stale before they're picked up. The **Walking Skeleton** (§9.2) is fully decomposed into 9 concrete, independently-verifiable tasks in the full brief; every later story follows the same method when it's actually about to start: take its Given/When/Then AC, break it into 5–15-minute vertical-slice tasks, give each a concrete verification check (never just a description of "done"), and state explicit non-goals per task.

### 10.4 Workflow, Guardrails & Key Technical Decisions

Explore → Plan → Implement → Commit for anything non-trivial. No UI-only permission check may stand in for real RLS enforcement. **CI/CD:** GitHub Actions — lint/typecheck/test on every PR, a release build on version tags. **Distribution:** Microsoft Store (free for individual developers, code signing handled automatically), GitHub Releases as a mirror. **Auto-update:** `electron-updater` with `autoDownload = false` — announce updates, let the collector choose to install. **Environments:** two Supabase projects, Free for development and Pro for production. **Backups:** periodic real restore-tests, not just "backups exist."

### 10.5–10.6 Verification & Human Review

Every task gets an automated check plus manual verification against its AC. Adversarial subagent review recommended for anything touching RLS, verification logic, or auth. Explicit human review required before merge for anything touching authentication, RLS/`verify_cover()`, bulk-import validation, or account deletion — these are the places a subtle bug does real damage to the catalogue's trust model, not just a cosmetic one.

---

## 11. Launch Plan

**Rollout phases:**

1. **Internal dogfood** — the PRD owner works through the full imported catalogue backlog and the Draft→Verified workflow personally first.
2. **Limited beta** — the named SME dealer and the fellow collector/dealer who originally confirmed the need, using both apps before wider release.
3. **Public launch** — once §3.5's criteria are met, release via the **Microsoft Store** (primary), mirrored on **GitHub Releases**, with a landing page at **www.indphila.com**, announced in the collector WhatsApp groups that originally validated the problem.

**Enablement:** No internal training needed. User-facing enablement is covered by the in-app Help/FAQ (FR-40) and Support contact link (FR-36).

**Comms:** A simple release note alongside each release; direct outreach to the SME dealer and fellow collector/dealer ahead of public launch; community announcement in the existing WhatsApp groups.

**Monitoring:** The PRD owner tracks §3.4's metrics directly — weekly for the first 4–6 weeks post-launch, tapering to monthly. Basic operational health via Supabase's and Vercel's own dashboards.

---

## 12. Open Questions

| #   | Question                                                                                                | Owner     | Status                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Does the app ship any AI/ML capability (e.g. image-based extraction)?                                   | PRD owner | No AI/ML in v1, but a genuine planned capability for a later phase — a natural fit with the separate AI-based visual-extraction cataloguing tool already being built |
| 2   | Mobile client stack (Android/iOS)                                                                       | PRD owner | Deliberately deferred — decide when that phase starts                                                                                                                |
| 3   | Verify Supabase Mumbai region availability/capacity at actual project-creation time                     | PRD owner | Open — check status.supabase.com before creating the project                                                                                                         |
| 4   | Confirm Supabase Free-tier spend-cap setting when moving to Pro                                         | PRD owner | Open — action item for that point in time                                                                                                                            |
| 5   | External expert-philatelist review of this PRD for domain accuracy                                      | PRD owner | Planned, not yet scheduled — worth doing before treating this document as fully final                                                                                |
| 6   | Catalogue numbering system (a citable reference number per entry, as serious philatelic catalogues use) | PRD owner | Explicitly deferred, not forgotten                                                                                                                                   |
| 7   | A field for the vernacular/regional-language name printed on the cover itself                           | PRD owner | Explicitly deferred, not forgotten                                                                                                                                   |
| 8   | Copyright status of reproducing India Post's cover images at catalogue scale                            | PRD owner | Explicitly deferred, not forgotten — worth a real legal opinion if pursued further                                                                                   |

---

## 13. Appendix

### 13.1 Glossary

- **Cachet:** the printed illustration on a special cover.
- **Cancellation:** the postmark design applied to a cover.
- **GI Tag:** Geographical Indication tag, identifying a product as originating from a specific region with qualities attributable to that origin.
- **Postal Circle:** India Post's regional administrative division; there are 23 official circles.
- **SME:** the subject-matter-expert dealer central to this project's verification workflow.

### 13.2 Official India Post Postal Circle List

Verified directly against India Post's own site, not a third-party summary: Andhra Pradesh, Assam, Bihar, Chhattisgarh, Delhi, Gujarat, Haryana, Himachal Pradesh, Jammu and Kashmir, Jharkhand, Karnataka, Kerala, Madhya Pradesh, Maharashtra, North Eastern, Orissa, Punjab, Rajasthan, Tamil Nadu, Telangana, Uttar Pradesh, Uttarakhand, West Bengal. Note two naming quirks preserved exactly from the official source: **"Orissa"** (not "Odisha") and **"North Eastern"** (not "North East").
