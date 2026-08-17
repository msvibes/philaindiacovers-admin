# PhilaIndiaCovers — Epics & User Story Map

Built using Jeff Patton's User Story Mapping method: the **backbone** (user activities, left to right, in the order they naturally happen) comes first, wide and shallow, before any story gets written. Stories are then stacked under each activity's tasks, prioritized top-to-bottom. Two personas get two separate backbones below — **Collector** (consumer app) and **Admin/Verifier** (back-office) — since they are different users with different journeys, not one continuous flow.

Every story traces back to a Functional Requirement (FR-##) already locked in The Standup Log — nothing here is invented fresh; this is that same locked scope, organized the way a story map organizes it.

---

## Part 1 — The Story Map (Backbone)

### Collector Backbone

| Get Started       | Browse the Catalogue    | Build My Collection  | Track My Wish List      | See My Progress       | Get Help When Stuck    | Manage My Account  |
| ----------------- | ----------------------- | -------------------- | ----------------------- | --------------------- | ---------------------- | ------------------ |
| Create an account | See what's available    | Add a cover I own    | Add something I want    | See how complete I am | Understand a term/icon | Update my info     |
| Verify my email   | Narrow down results     | See my collection    | Prioritize what matters | See what I'm missing  | Get oriented if lost   | Change my password |
| Log in            | Find something specific | Update details later | See my list             | See what I've spent   | Find someone to ask    | Get support        |
| Learn the app     | Sort the list           | Remove a mistake     | Update or remove        |                       |                        | Leave, if I choose |
| Reset my password | See full details        | Search within my own | Search within my own    |                       |                        |                    |
| Log out           | Notice what's new       |                      |                         |                       |                        |                    |

### Admin/Verifier Backbone

| Admin & Verifier Access     | Import & Maintain Data       | Verify Accuracy           | Monitor Progress                |
| --------------------------- | ---------------------------- | ------------------------- | ------------------------------- |
| Log into the back-office    | Bring in the initial backlog | Review what's new         | Check progress vs. launch goals |
| Only do what my role allows | Add new covers over time     | Confirm or flag           |                                 |
|                             | Avoid accidental duplicates  | See corrections come back |                                 |
|                             |                              | Trust the audit trail     |                                 |

**Reading this map:** each column above is an Epic. Each row-item under a column is a Task. The User Stories in Part 3 are what sits underneath each task — this map is the "wide and shallow" pass; Part 3 is "narrow and deep."

---

## Part 2 — Epics

| Epic ID | Epic Name                        | Persona        | Goal                                                                                      | Linked FRs                                          |
| ------- | -------------------------------- | -------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------- |
| EPIC-01 | Get Started                      | Collector      | A new collector can create an account, verify it, and understand the app before diving in | FR-26, 27, 28, 29, 30, 37                           |
| EPIC-02 | Browse the Catalogue             | Collector      | A collector can find and inspect any Verified cover                                       | FR-01, 02, 03, 04, 05, 18                           |
| EPIC-03 | Build My Collection              | Collector      | A collector can record and manage their own holdings                                      | FR-06, 07, 08, 09, 16 (Collection), 19 (Collection) |
| EPIC-04 | Track My Wish List               | Collector      | A collector can track and prioritize what they want                                       | FR-10, 11, 12, 16 (Wish List), 19 (Wish List)       |
| EPIC-05 | See My Progress                  | Collector      | A collector can see completeness, gaps, and spend                                         | FR-13, 14, 15                                       |
| EPIC-06 | Get Help When Stuck              | Collector      | A collector gets oriented without needing to ask a person                                 | FR-38, 39, 40                                       |
| EPIC-07 | Manage My Account                | Collector      | A collector can maintain and, if needed, leave their account                              | FR-31, 33, 34, 35, 36                               |
| EPIC-08 | Admin & Verifier Access          | Admin/Verifier | The right person can do the right things, enforced for real                               | FR-25, 32                                           |
| EPIC-09 | Import & Maintain Catalogue Data | Admin          | The catalogue gets populated reliably, backlog and ongoing                                | FR-17, 20, 21                                       |
| EPIC-10 | Verify Catalogue Accuracy        | Verifier/Admin | Nothing reaches collectors unverified, with a real trail                                  | FR-22, 23, 24                                       |
| EPIC-11 | Monitor Product Progress         | Admin          | One place to check progress against the actual success metrics                            | Admin dashboard extension (§3.4)                    |

**INVEST applied at the epic-splitting level, not restated per story below:** every epic above is Independent (little functional overlap with another), Valuable on its own (each maps to a real "why would a user open the app right now" moment), and separately Estimable/sizeable as a unit. Stories within each pass the same check individually — called out explicitly only where a story's INVEST fit is genuinely debatable, not repeated as boilerplate for all 42.

---

## Part 3 — User Stories

_Format: `US-##` · Story · Linked FR · Priority (inherited from the FR's already-locked priority) · Size · Acceptance Criteria (Given/When/Then)_

**On sizing:** these are S/M/L relative-size estimates (S≈1, M≈3, L≈5 if you need numbers for Jira), not team-calibrated story points — there's no multi-person planning poker session behind them since Claude Code is the implementer, not a human team. Treat them as a rough sequencing signal, not a committed estimate; re-baseline once real implementation velocity exists.

### EPIC-01 — Get Started

**US-01** _(revised — Apple SSO dropped for v1, see Standup Log)_ · As a new collector, I want to sign up with email/password or Google, so that I can start using the app with whichever method I prefer. · FR-26 · P0 · M

- _AC:_ Given I don't have an account, when I sign up with any of the three methods, then an account is created and I'm logged in.
- _AC (edge case):_ Given an account already exists under my email via a different method, when I sign up again with a new method using the same email, then the new method is linked to the existing account rather than creating a duplicate, and I see a message explaining that.

**US-02** · As a new collector who signed up with email/password, I want to verify my email before I can use the app, so that my account is confirmed as genuinely mine. · FR-27 · P0 · S

- _AC:_ Given I signed up with email/password, when I haven't yet clicked the verification link, then I cannot access the app's features beyond the verification prompt.

**US-03** · As a returning collector, I want to log in with any method linked to my account, so that I can access my collection regardless of which method I originally used. · FR-28 · P0 · M

- _AC:_ Given my account has methods linked (e.g. Google + email/password), when I log in with either, then I reach the same account and data.

**US-04** · As a collector who forgot my password, I want to reset it via email, so that I can regain access without contacting support. · FR-29 · P0 · S

- _AC:_ Given I request a password reset, when I follow the emailed link and set a new password, then I can log in with it immediately.

**US-05** · As a collector, I want to log out, so that I can secure my account on a shared or public machine. · FR-30 · P0 · S

- _AC:_ Given I'm logged in, when I log out, then my session ends and the app returns to the login screen.

**US-06** · As a first-time collector, I want an optional guided walkthrough on my first login, so that I understand the Catalogue, Collection, and Wish List before diving in. · FR-37 · P1 · M

- _AC:_ Given this is my first login, when the app loads, then I'm offered a skippable walkthrough introducing the three core areas.

### EPIC-02 — Browse the Catalogue

**US-07** · As a collector, I want to see all Verified covers in a list with thumbnail, name, category, postal circle, and issue date, so that I can browse at a glance. · FR-01 · P0 · M

- _AC:_ Given Verified covers exist, when I open the Catalogue, then I see each one with all five data points visible without clicking in.

**US-08** · As a collector, I want to filter the catalogue by Postal Circle, Product Category, and Date of Issue, so that I can narrow down to covers I care about. · FR-02 · P0 · M

- _AC:_ Given I apply one or more filters, when results update, then only matching Verified entries are shown.

**US-09** · As a collector, I want to search the catalogue by keyword across item name, cover name, and description, so that I can find a specific cover even if I don't remember which field it's in. · FR-03 · P0 · M

- _AC:_ Given I type a known product name, when I search, then the matching entry appears in results.

**US-10** · As a collector, I want to sort the catalogue by date (most recent first, default) or alphabetically, so that I can browse in the order that makes sense to me. · FR-04 · P1 · S

- _AC:_ Given I toggle the sort option, when the list re-renders, then order changes correctly between the two modes.

**US-11** · As a collector, I want to open any cover and see its full details (registration number, cancellation, cachet, description, place of issue, full image), so that I get the complete record, not just the summary. · FR-05 · P0 · M

- _AC:_ Given I select any catalogue entry, when the detail view opens, then every schema field not shown in the list view is visible.

**US-12** · As a collector, I want to see a "New" indicator on covers added since my last visit, so that I notice fresh additions without re-browsing the whole catalogue. · FR-18 · P2 · S

- _AC:_ Given a cover was added after my last login, when I view the catalogue, then it shows a visible "New" badge until I view it.

### EPIC-03 — Build My Collection

**US-13** · As a collector, I want to add a cover to my Collection with acquisition date, condition, postal usage, acquisition method, price paid, and notes, so that I can record everything that matters about my own copy. · FR-06 · P0 · L

- _AC:_ Given a Verified cover, when I add it to my Collection with all six fields, then the entry is saved against my account only.
- _AC (edge case):_ Given I already own a copy of a cover, when I add another entry for the same cover, then both entries are stored independently (duplicates/multiple copies supported).

**US-14** · As a collector, I want to view my full Collection as a list with each entry's personal details, so that I can see my holdings at a glance. · FR-07 · P0 · M

- _AC:_ Given I have Collection entries, when I open My Collection, then each is listed with its personal details visible.

**US-15** · As a collector, I want to edit an existing Collection entry's details, so that I can correct or update information over time. · FR-08 · P1 · S

- _AC:_ Given an existing entry, when I edit any of its fields, then the change is saved and persists.

**US-16** · As a collector, I want to remove a cover from my Collection, so that I can fix mistakes without affecting the shared catalogue. · FR-09 · P1 · S

- _AC:_ Given an entry in my Collection, when I remove it, then it disappears from my view and the shared catalogue entry is unaffected.

**US-17** · As a collector, I want to search and filter within my own Collection, so that I can find something in my holdings without scrolling the whole list. · FR-19 (Collection) · P2 · S

- _AC:_ Given entries in my Collection, when I search/filter within it, then only matching entries from my own Collection are returned.

**US-18** · As a collector, I want to be clearly blocked (with a message) from adding or editing Collection entries while offline, so that I understand why the action isn't going through rather than losing my work silently. · FR-16 (Collection) · P0 · S

- _AC:_ Given I'm offline, when I attempt to add or edit a Collection entry, then the action is disabled with a visible explanatory message, and succeeds immediately once reconnected.

### EPIC-04 — Track My Wish List

**US-19** · As a collector, I want to add a cover to my Wish List with notes and a priority level, so that I can track what I want and how badly. · FR-10 · P0 · M

- _AC:_ Given a Verified cover, when I add it to my Wish List with notes and a priority, then the entry is saved against my account only.

**US-20** · As a collector, I want to view my Wish List sorted by priority (Holy Grail down to Someday, Maybe), so that I see my most-wanted covers first. · FR-11 · P1 · S

- _AC:_ Given entries at different priority levels, when I view my Wish List, then it can be sorted so Holy Grail entries surface first.

**US-21** · As a collector, I want to edit or remove a Wish List entry, so that I can keep my list current as my wants change. · FR-12 · P1 · S

- _AC:_ Given an existing Wish List entry, when I edit or remove it, then the change persists correctly.

**US-22** · As a collector, I want to search and filter within my own Wish List, so that I can find something on my list without scrolling. · FR-19 (Wish List) · P2 · S

- _AC:_ Given entries on my Wish List, when I search/filter within it, then only matching entries are returned.

**US-23** · As a collector, I want to be clearly blocked (with a message) from adding or editing Wish List entries while offline, so that I understand why the action isn't going through. · FR-16 (Wish List) · P0 · S

- _AC:_ Given I'm offline, when I attempt to add or edit a Wish List entry, then the action is disabled with a visible message, and succeeds once reconnected.

### EPIC-05 — See My Progress

**US-24** · As a collector, I want to see what percentage of the Verified catalogue I own, so that I have a sense of progress. · FR-13 · P1 · S

- _AC:_ Given my Collection and the total Verified catalogue count, when I view this stat, then it accurately reflects (my covers ÷ total Verified covers).

**US-25** · As a collector, I want to see a list of Verified covers not yet in my Collection, so that I have a practical "what am I missing" reference distinct from my manually-curated Wish List. · FR-14 · P1 · M

- _AC:_ Given Verified covers exist, when I view this list, then it shows every Verified cover not currently in my Collection.

**US-26** · As a collector, I want to see my total spend on purchased covers, with gifted/inherited/traded covers counted separately, so that I get an honest financial picture rather than a misleading blended number. · FR-15 · P2 · M

- _AC:_ Given Collection entries with varied acquisition methods, when I view spend, then only "Purchased" entries are summed, and non-purchased entries are shown as a separate count, not folded into the total or silently ignored.

### EPIC-06 — Get Help When Stuck

**US-27** · As a collector, I want hover tooltips on non-obvious UI elements like Wish List priority names and filter icons, so that playful labels don't come at the cost of clarity. · FR-38 · P1 · S

- _AC:_ Given an element like a priority tier name, when I hover over it, then a tooltip explains it.

**US-28** · As a collector, I want an inline "what's this?" explainer for philatelic terms like Cachet and Cancellation, so that I can use the app confidently even if I'm newer to the hobby. · FR-39 · P2 · S

- _AC:_ Given a field like "Cachet," when I select its "what's this?" control, then a plain-language explanation appears.

**US-29** · As a collector, I want a minimal in-app Help/FAQ, so that I have somewhere to go beyond just a contact email. · FR-40 · P2 · S

- _AC:_ Given I need basic guidance, when I open Help from Settings, then I see FAQ-style content covering core app usage.

### EPIC-07 — Manage My Account

**US-30** · As a collector, I want to view and edit my basic profile info, so that my account details stay accurate. · FR-33 · P1 · S

- _AC:_ Given my profile, when I edit name or email, then the change is saved.

**US-31** · As a collector with an email/password account, I want to change my password, so that I can maintain my own account security. · FR-34 · P1 · S

- _AC:_ Given an email/password account, when I set a new password, then I can log in with it going forward; SSO-only accounts don't see this option.

**US-32** · As a collector, I want a minimal Support section with a contact link, so that I have a way to reach the developer if something goes wrong. · FR-36 · P2 · S

- _AC:_ Given I open Settings, when I select Support, then a working contact link (e.g. mailto:) is presented.

**US-33** · As a collector, I want to delete my account and its data myself, so that I'm not dependent on manually contacting someone to leave. · FR-31, FR-35 · P1 · M

- _AC:_ Given I choose account deletion from Settings, when I confirm, then my account and its Collection/Wish List data are removed.

### EPIC-08 — Admin & Verifier Access

**US-34** · As an Admin or Verifier, I want to log into the back-office via email/password or Google SSO, so that I can access my role's tools. · FR-32 · P0 · S

- _AC:_ Given valid back-office credentials, when I log in, then I reach the tools appropriate to my role.

**US-35** · As an Admin, I want role permissions enforced at the database level, not just hidden in the UI, so that a Verifier genuinely cannot alter cover metadata even by bypassing the interface. · FR-25 · P0 · M

- _AC:_ Given a Verifier account attempts to directly edit cover metadata (bypassing normal UI flow), when the request reaches the database, then it is rejected by row-level security, not merely hidden from view.

### EPIC-09 — Import & Maintain Catalogue Data

**US-36** · As an Admin, I want to bulk-import covers via a spreadsheet and matching images, with filename validation and a preview before anything is created, so that I can load the initial backlog reliably. · FR-20 · P0 · L

- _AC:_ Given a spreadsheet and image set, when I run bulk import, then every referenced filename is validated first, a preview of any failures is shown, and only valid rows create Draft entries.

**US-37** · As an Admin, I want to add or edit a single cover directly outside of bulk import, so that I can add new covers incrementally as they're issued after launch. · FR-21 · P0 · M

- _AC:_ Given the ongoing (post-launch) need to add one cover at a time, when I use the single-entry form, then a new cover is created or an existing one is edited without needing a spreadsheet.

**US-38** · As an Admin, I want the system to flag likely duplicate rows during bulk import (matching GI Item + Date of Issue), so that human data-entry mistakes don't silently double up the catalogue. · FR-17 · P0 · M

- _AC:_ Given a row matches an existing entry's GI Item + Date of Issue (any status), when import runs, then it's flagged for manual confirmation rather than auto-created.

### EPIC-10 — Verify Catalogue Accuracy

**US-39** · As a Verifier, I want to review Draft and re-submitted Flagged entries and mark each Verified or Flagged with a reason, so that only accurate entries reach collectors. · FR-22 · P0 · L

- _AC:_ Given a Draft or re-submitted Flagged entry, when I review it against physical holdings, then I can mark it Verified or Flagged-with-reason, and only Verified entries become visible in the consumer catalogue.

**US-40** · As an Admin, I want every verification action logged with who/what/when/reason, so that there's a real audit trail behind the accuracy guardrail. · FR-23 · P0 · M

- _AC:_ Given any verification status change, when it occurs, then a timestamped, attributed audit-trail entry is created automatically.

**US-41** · As a Verifier, I want a corrected Flagged entry to return to my review queue rather than being self-marked Verified by the Admin, so that I remain the sole authority on what counts as accurate. · FR-24 · P0 · S

- _AC:_ Given a Flagged entry gets corrected by the Admin, when the correction is saved, then its status resets to pending-review, not Verified.

### EPIC-11 — Monitor Product Progress

**US-42** · As the PRD owner (Admin), I want the back-office Dashboard to show registered-user count and Collection-activation-rate alongside existing catalogue-status counts, so that I have one place to check progress against the actual success metrics. · Admin dashboard extension (§3.4) · P1 · M

- _AC:_ Given the Dashboard already shows Draft/Verified/Flagged counts, when this extension ships, then registered-user count and Collection-activation-rate are visible on the same screen.

---

## Part 4 — Release Slicing

Per Patton's slicing approach and the PRD template's own "build technical-risk-surfacing parts first" guidance:

### Walking Skeleton (build first — thin, ugly, but proves the entire pipeline end-to-end)

The single highest-risk unknown here is the full data pipeline: spreadsheet → Draft → Verified → visible to a collector. Everything else is easier to verify once this thread is proven:

- US-36 (bulk import) → US-39 (Verifier marks Verified) → US-07 (collector sees it in the catalogue list) → US-11 (collector opens full detail)

This slice deliberately skips auth, filtering, Collection, Wish List — it exists only to prove the core mechanism works, and should stay internal, never shown to a real user.

### Release 1 (full v1 — every P0 and P1 story above)

This is simply every story tagged P0/P1 in Part 3 — already the locked scope from The Standup Log, just now organized as an executable backlog rather than a flat requirements list.

### Natural trim candidates if the schedule slips (already P2, already in scope, but first to cut under real time pressure)

US-12 (New indicator), US-17/US-22 (search within Collection/Wish List), US-26 (spend report), US-28 (inline term explainer), US-29 (in-app FAQ), US-32 (Support link — though this one is cheap enough it's rarely worth cutting).

---

## Part 5 — Jira Export Notes

When you're ready to actually move this into Jira:

- **Epic** (Part 2) → Jira **Epic**, using the Epic Name as-is
- **User Story** (Part 3) → Jira **Story**, with the "As a / I want / so that" line as the Summary/Description
- **Given/When/Then AC** → paste into Jira's Description or a dedicated "Acceptance Criteria" field if your Jira instance has one configured
- **Priority (P0/P1/P2)** → maps to Jira's Highest/High/Medium (or your instance's equivalent scale)
- **Size (S/M/L)** → maps to Jira Story Points as 1/3/5 if you want a numeric field populated, with the caveat above about these being rough, not team-calibrated

I can generate an actual Jira-importable CSV (Jira supports direct CSV import with columns like Issue Type, Summary, Epic Link, Priority, Story Points, Labels) whenever you're ready to do that import — just say the word, no need to decide now.
