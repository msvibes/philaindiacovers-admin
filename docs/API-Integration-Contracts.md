# PhilaIndiaCovers — §6.4 API / Integration Contracts

Since the backend is Supabase, this section isn't a hand-designed REST API spec — Supabase's PostgREST layer auto-generates REST endpoints directly from the database tables below, with access controlled by Row-Level Security (RLS) policies rather than application code. The real "contract" that needs designing is: the schema, the RLS rules, and the custom logic that goes beyond simple CRUD. That's what follows.

---

## 1. Core Database Schema

### `profiles`
Extends Supabase's built-in `auth.users`.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | References `auth.users.id` |
| role | text | `collector` (default) / `admin` / `verifier` |
| display_name | text | |
| created_at | timestamptz | |

### `postal_circles` (reference/lookup table)
Seeded once with the 23 officially verified India Post circles (see Reference Data).

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| name | text, unique | e.g. "Uttar Pradesh", "Orissa", "North Eastern" |

### `covers` (the shared catalogue)

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| image_file | text | Supabase Storage path |
| name_of_cover | text | |
| gi_item_name | text | |
| gi_registration_number | text, nullable | Extracted from source text where present |
| product_category | text, nullable | Free text, not constrained |
| cancellation_description | text | |
| cachet_description | text | |
| overall_description | text | |
| postal_circle_id | uuid, FK → postal_circles.id | Normalized, not free text |
| place_of_issue | text | |
| date_of_issue | date | |
| verification_status | text | `draft` (default) / `verified` / `flagged` |
| verified_by | uuid, FK → profiles.id, nullable | |
| verified_at | timestamptz, nullable | |
| created_at / updated_at | timestamptz | |

### `collection_items` (FR-06 to FR-09, FR-13-16, FR-19)

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | |
| cover_id | uuid, FK → covers.id | |
| acquisition_date | date | |
| condition | text | `superb_xf` / `very_fine` / `fine` / `good_average` |
| postal_usage | text | `addressed_only` / `genuinely_used` |
| acquisition_method | text | `purchased` / `gifted` / `inherited` / `traded` / `other` |
| price_paid | numeric, nullable | |
| notes | text, nullable | |
| created_at / updated_at | timestamptz | |

**No unique constraint on (user_id, cover_id)** — deliberate, since FR-06 explicitly supports owning multiple copies of the same cover.

### `wishlist_items` (FR-10 to FR-12, FR-16, FR-19)

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | |
| cover_id | uuid, FK → covers.id | |
| priority | text | `holy_grail` / `hunting_hard` / `would_be_thrilled` / `nice_to_add` / `someday_maybe` |
| notes | text, nullable | |
| created_at / updated_at | timestamptz | |

**Assumption flagged, not silently decided:** UNIQUE(user_id, cover_id) — one wishlist entry per cover per user, unlike Collection. Reasoning: wanting the same cover "twice" isn't a meaningful distinct state the way owning two physical copies is. Correct me if wrong.

### `verification_audit_log` (FR-23)

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| cover_id | uuid, FK → covers.id | |
| action | text | `verified` / `flagged` / `correction_resubmitted` |
| performed_by | uuid, FK → profiles.id | |
| reason | text, nullable | Required when action = `flagged` |
| performed_at | timestamptz | |

---

## 2. Row-Level Security Policy Summary

| Table | Collector | Admin | Verifier |
|---|---|---|---|
| `covers` | SELECT only where `verification_status = 'verified'` | Full read/write | SELECT where `draft` or `flagged`; **no direct write** (see below) |
| `collection_items` | Full r/w, own rows only (`user_id = auth.uid()`) | No access needed | No access needed |
| `wishlist_items` | Full r/w, own rows only | No access needed | No access needed |
| `verification_audit_log` | No access | SELECT (view trail) | No direct write (see below) |
| `postal_circles` | Public read | Read | Read |

**Important technical nuance driving FR-25's "database-level enforcement" requirement:** Postgres RLS is *row-level*, not *column-level* — it can't natively say "Verifier can edit this one column but not others" on the same row. Direct table access alone can't cleanly enforce "Verifier changes status, never metadata." The fix: **Verifiers get no direct UPDATE grant on `covers` at all** — they can only call the `verify_cover()` function below, which runs with elevated privileges and does the one specific, controlled thing it's allowed to do. This is what actually satisfies FR-25 at the database level, not just a UI restriction.

---

## 3. Custom Functions (beyond simple CRUD)

### `verify_cover(p_cover_id uuid, p_new_status text, p_reason text default null)`
- **Callable by:** Verifier role only
- **Does:** validates `p_new_status` is `verified` or `flagged`; requires `p_reason` when flagging; updates the cover's `verification_status`/`verified_by`/`verified_at`; inserts a matching row into `verification_audit_log` — all atomically, in one transaction
- **Satisfies:** FR-22, FR-23, FR-24, FR-25

### Bulk import (Edge Function, not a simple table insert)
- **Callable by:** Admin role only
- **Does:** accepts the spreadsheet + image files; validates every referenced image filename exists before creating anything; checks each row's GI Item + Date of Issue against existing `covers` rows (any status) and flags likely duplicates; creates `draft` entries only for rows that pass; returns a per-row success/failure report for the import-preview screen
- **Satisfies:** FR-17, FR-20

### Collector stats (view or lightweight function)
- **Does:** computes completeness % (owned ÷ total Verified), the "not yet in my Collection" list, and Purchased-only spend total with a separate non-Purchased count
- **Satisfies:** FR-13, FR-14, FR-15
- Likely implementable as a Postgres **view** rather than a function, given it's pure read/aggregation with no side effects — simpler and easier to maintain.

### Dashboard stats (view or lightweight function)
- **Does:** registered-user count + Collection-activation-rate, alongside the existing Draft/Verified/Flagged counts already on the back-office Dashboard
- **Satisfies:** Admin dashboard extension (§3.4)

---

## 4. Third-Party Integrations

| Integration | Purpose | Notes / Failure Mode |
|---|---|---|
| Google OAuth (via Supabase Auth) | Consumer + back-office SSO | Requires a Google Cloud OAuth Client ID/Secret configured in Supabase Auth settings. Failure mode: if Google's OAuth service is briefly unavailable, email/password remains a working fallback login path. |
| ~~Apple Sign In~~ | — | **Dropped for v1** (Session 6) — requires a $99/year Apple Developer Program membership; revisit if/when justified by real demand. |
| Supabase Storage | Cover images | Admin-only writes (via bulk import / single-entry admin form); public read access for images belonging to `verified` covers only — mirrors the same RLS logic as the `covers` table itself, just applied to the storage bucket's own access policy. |

**One real implementation dependency worth flagging now, not discovering later:** FR-26's account-linking behavior (same email, different signup method → linked, not duplicated) depends on Supabase Auth's **"Manual Linking"** setting being explicitly enabled — it is not necessarily the default behavior out of the box. This needs to be turned on and tested specifically, not assumed to work automatically.

---

## Status: LOCKED (confirmed by PRD owner)

- Wishlist UNIQUE(user_id, cover_id) constraint — confirmed as-is
- `verify_cover()` function approach for FR-25 database-level enforcement — confirmed as the right technical approach
- Remaining implementation-time verification item (not a design decision, just a build-time check): confirm Supabase Auth's Manual Linking setting is enabled and test the Google ↔ email/password linking scenario end-to-end during actual development
