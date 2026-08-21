import { extractGiRegistrationNumber } from "./extractGiRegistrationNumber";
import { isDuplicateCover, type ExistingCoverKey } from "./isDuplicateCover";
import { parseDateOfIssue } from "./parseDateOfIssue";

// isDuplicateCover() itself does an exact string match on both fields
// and has no idea about date formats or embedded GI-number annotations —
// it expects values already in the same shape existing rows are stored
// in. Passing it raw CSV text directly was a real, live bug: the import
// preview (import/page.tsx) called isDuplicateCover() with the raw "Name
// of the GI Tag / Item" and "Date of Issue" text unchanged, so it
// reported "no issues" for a real 287-row import that actually had 24
// already-existing duplicates — every row, 100% of the time, not just
// the real ones. Two distinct fields, one root cause: the preview never
// converted CSV input into the same shape the server stores.
//
//   - Date of Issue: a raw CSV date ("15/11/2021") never equals an
//     existing row's canonical ISO date ("2021-11-15") as a string.
//   - Name of the GI Tag / Item: a raw CSV name embedding "(GI No. 438)"
//     never equals the existing row's cleaned name ("Tezpur Litchi"),
//     since /api/confirm-import always strips that annotation via
//     extractGiRegistrationNumber() before inserting.
//
// /api/confirm-import's own server-side check was never affected by
// either — it already parses the date and strips the GI-number
// annotation before comparing. This function does the identical two
// conversions, reused (not reimplemented) via parseDateOfIssue and
// extractGiRegistrationNumber, so the preview and the server can never
// drift apart on what counts as a duplicate again.
//
// Any future caller comparing a raw CSV row against existing covers
// should go through this, not isDuplicateCover() with raw CSV text
// directly, for exactly this reason.
export function isDuplicateCoverRow(
  rawGiItemName: string,
  rawDateOfIssue: string,
  existing: ExistingCoverKey[]
): boolean {
  const key = computeCoverKey(rawGiItemName, rawDateOfIssue);
  if (!key) return false;
  return isDuplicateCover(key.gi_item_name, key.date_of_issue, existing);
}

// Same raw-CSV-row-to-key conversion isDuplicateCoverRow uses internally,
// exposed so a caller building up its own running "existing" list (see
// import/page.tsx's within-batch duplicate tracking, mirroring
// /api/confirm-import's own existing.push() step) can reuse the identical
// cleaning logic instead of re-deriving it. Returns null for a row whose
// date doesn't parse, matching isDuplicateCoverRow's own "not a duplicate"
// treatment of that case.
export function computeCoverKey(
  rawGiItemName: string,
  rawDateOfIssue: string
): { gi_item_name: string; date_of_issue: string } | null {
  const dateResult = parseDateOfIssue(rawDateOfIssue);
  if (!dateResult.ok) return null;
  const { cleanedName } = extractGiRegistrationNumber(rawGiItemName);
  return { gi_item_name: cleanedName, date_of_issue: dateResult.isoDate };
}

export type BatchDuplicateCheckRow = {
  giItemName: string;
  dateOfIssue: string;
  missingImage: boolean;
};

// Batch counterpart to isDuplicateCoverRow: walks rows in CSV order,
// mirroring /api/confirm-import's own loop, where `existing` starts as
// the DB-fetched list and grows via existing.push() after every row it
// successfully creates — so a later row sharing the same GI Item + Date
// of Issue as an earlier row in the SAME batch is caught there too, not
// just against pre-existing database rows.
//
// Without this, the preview (import/page.tsx) fetched `existing` once and
// never updated it while walking the CSV, so two rows in the same file
// sharing a GI Item + Date both showed as OK — proven with a real,
// already-imported pair: CSV rows 47 and 48, whose "Name of the GI Tag /
// Item" is the identical literal text "Kullu Shawl" in both, both dated
// 20/10/2021 (they differ only in "Name of the Cover", which isn't part
// of the duplicate key). The preview showed both OK; Confirm Import
// (which already did carry this same-batch tracking) correctly created
// the first and rejected the second as a duplicate — a real, observed
// mismatch this closes by giving the preview the identical tracking.
//
// A row only contributes its key to that running list here under the same
// three conditions /api/confirm-import requires before it would reach an
// actual insert: not missing its image, a parseable date, and not itself
// already flagged as a duplicate.
export function computeBatchDuplicateFlags(
  rows: BatchDuplicateCheckRow[],
  existing: ExistingCoverKey[]
): boolean[] {
  const batchExisting = [...existing];
  return rows.map((row) => {
    const duplicate = isDuplicateCoverRow(row.giItemName, row.dateOfIssue, batchExisting);
    if (!row.missingImage && !duplicate) {
      const key = computeCoverKey(row.giItemName, row.dateOfIssue);
      if (key) batchExisting.push(key);
    }
    return duplicate;
  });
}
