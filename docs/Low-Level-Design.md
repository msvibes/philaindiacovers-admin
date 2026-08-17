# PhilaIndiaCovers — Low-Level Design (Walking Skeleton scope only)

**A deliberate scoping note, not an oversight:** this LLD covers only the Walking Skeleton (T-01–T-09) — the part of the system actually being built right now. Writing detailed low-level design for all 42 stories before any of their code exists would go stale before it's ever used, for the same reason full task-decomposition wasn't done upfront in the AI-Agent Implementation Brief. Extend this document story-by-story, in the same way task decomposition happens — right before each story is actually picked up, not months in advance.

---

## 1. Database Layer (T-01 — complete)

Already implemented and verified: `profiles`, `postal_circles` (seeded, 23 rows), `covers` (no RLS yet). Full column-level spec: `docs/API-Integration-Contracts.md`.

## 2. Bulk Import — Detailed Design (T-02 complete, T-03 next)

**As actually built (T-02) — corrected from this document's original speculative design, which described a server endpoint that was never the real architecture:**

The validation/preview stage runs entirely **client-side**, in the Next.js admin app's `/import` route — there is no `POST /bulk-import` server endpoint for this stage. CSV parsing uses Papa Parse with a `transform` option that runs `sanitizeCsvCell()` (see below) on every field of every row as it's parsed.

**CSV headers — the real, human-readable ones from the actual source spreadsheet, not database column names:**
`Image File Name`, `Name of the Cover`, `Name of the GI Tag / Item`, `Product Category`, `Description of Cancellation`, `Description of Cachet`, `Overall Description`, `Issuing Postal Circle`, `Place of Issue`, `Date of Issue`.

**`sanitizeCsvCell()` — `src/lib/sanitizeCsvCell.ts` (Admin repo):**

```
sanitizeCsvCell(value: string | null | undefined): string
```

Strips leading whitespace (including tab/CR, covered by `\s`) and leading `=`/`+`/`-`/`@` characters in a loop until stable, so nested/repeated evasion (e.g. `" = =cmd"`) is fully neutralized, not just the single-character case. `null`/`undefined` input returns `""` rather than throwing — a real crash risk caught during review, since Papa Parse's `transform` runs this on every cell regardless of whether it's populated (confirmed against real data: `Product Category` is blank in the actual source spreadsheet). Covered by 8 Vitest unit tests in `sanitizeCsvCell.test.ts`.

**Validation algorithm (preview stage, no DB writes):**

1. Parse CSV via Papa Parse, `sanitizeCsvCell` applied per-cell via `transform`.
2. For each row, check the `Image File Name` value exists among the uploaded image files by name; rows without a match are flagged in the preview.
3. _(T-03, next)_ For each row that passes filename validation, check for a duplicate against existing `covers` — see below.

## 3. Duplicate Detection — Detailed Design (T-03, not yet built — this is forward design for the upcoming task)

**Algorithm:**

1. For each row passing filename validation, query `covers` (any `verification_status` — draft, verified, or flagged) for a row matching both `Name of the GI Tag / Item` and `Date of Issue` exactly.
2. Rows with a match are added to the preview as a **distinct category from missing-image failures** — a duplicate isn't the same kind of problem as a missing file, and the UI should let the Admin visually tell them apart at a glance.
3. Duplicates don't block the row from being imported if the Admin explicitly overrides — per FR-17, this is a flag for manual confirmation, not an automatic hard rejection (a legitimate re-issue or correction scenario could look like a duplicate but not be one).

**Open question worth confirming before building:** should this query run one-by-one per row (simple, N queries for N rows) or as a single batched query (fetch all existing `gi_item_name`+`date_of_issue` pairs once, compare in-memory)? For a backlog import of 288 rows, batching is meaningfully faster and is the right call — worth stating explicitly here rather than leaving it to be decided ad-hoc during implementation.

## 4. `verify_cover()` — Detailed Design (T-04, T-06 — not yet built)

**Signature (Postgres function, `SECURITY DEFINER`):**

```sql
verify_cover(p_cover_id uuid, p_new_status text, p_reason text DEFAULT NULL)
RETURNS void
```

**Algorithm:**

1. Check `auth.uid()`'s role in `profiles` is `verifier`; raise an exception otherwise (defense in depth — RLS should already block non-verifiers from calling this at all).
2. Validate `p_new_status` is exactly `'verified'` or `'flagged'`; raise an exception otherwise.
3. If `p_new_status = 'flagged'`, require `p_reason` is non-null and non-empty; raise an exception otherwise.
4. Update `covers` row: set `verification_status`, `verified_by = auth.uid()`, `verified_at = now()`.
5. Insert into `verification_audit_log`: `cover_id`, `action`, `performed_by = auth.uid()`, `reason`, `performed_at = now()`.
6. Steps 4–5 happen in the same transaction — either both succeed or neither does.

**Correction loop (T-24's invariant, enforced here not in the UI):** when the Admin corrects a `flagged` cover's metadata directly (a plain table UPDATE, not via this function), a database trigger resets `verification_status` back to `'draft'` automatically — this is what actually makes it impossible for the Admin to accidentally leave a corrected entry in `verified` state without a fresh Verifier pass. _(Trigger to be written alongside T-06 — flagged here as the mechanism, not yet implemented.)_

## 5. RLS Policies — Detailed Design (T-04)

```sql
-- covers: Collector read
CREATE POLICY collector_read_verified ON covers FOR SELECT
  USING (verification_status = 'verified');

-- covers: Admin full access
CREATE POLICY admin_full_access ON covers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- covers: Verifier read-only on draft/flagged, NO write policy at all
CREATE POLICY verifier_read_draft_flagged ON covers FOR SELECT
  USING (
    verification_status IN ('draft', 'flagged')
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'verifier')
  );

-- collection_items / wishlist_items: owner-only, both tables identical pattern
CREATE POLICY own_rows_only ON collection_items FOR ALL
  USING (user_id = auth.uid());
```

## 6. Catalogue List/Detail — Detailed Design (T-08, T-09)

**Query (list view, FR-01):**

```sql
SELECT id, image_file, gi_item_name, product_category, postal_circle_id, date_of_issue
FROM covers
WHERE verification_status = 'verified'
ORDER BY date_of_issue DESC; -- FR-04 default
```

Postal circle name resolved via a join or a client-side lookup against the small, cached `postal_circles` table (only 23 rows — safe to fetch once and hold in memory rather than re-joining every query).

**Detail view (FR-05):** single-row fetch by `id`, all columns, no additional logic — the entire point of this task is confirming the pipeline surfaces one real record correctly end-to-end.

---

_Extend this document with the same level of detail for each subsequent story, right before it's picked up — not in a batch upfront._
