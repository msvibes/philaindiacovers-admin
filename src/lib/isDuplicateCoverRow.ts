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
  const dateResult = parseDateOfIssue(rawDateOfIssue);
  if (!dateResult.ok) return false;
  const { cleanedName } = extractGiRegistrationNumber(rawGiItemName);
  return isDuplicateCover(cleanedName, dateResult.isoDate, existing);
}
