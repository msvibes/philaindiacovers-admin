import { extractGiRegistrationNumber } from "./extractGiRegistrationNumber";
import { parseDateOfIssue } from "./parseDateOfIssue";
import { normalizePostalCircleName } from "./normalizePostalCircle";
import { normalizeFileName } from "./normalizeFileName";
import type { CoverRow } from "./coverImportRow";

export type ExistingCoverForUpdate = {
  id: string;
  gi_item_name: string | null;
  date_of_issue: string | null;
  name_of_cover: string | null;
  product_category: string | null;
  cancellation_description: string | null;
  cachet_description: string | null;
  overall_description: string | null;
  place_of_issue: string | null;
  postal_circle_id: string | null;
  image_file: string | null;
};

export type FieldDiff = { field: string; oldValue: string | null; newValue: string };

export type ImageChange = { type: "none" } | { type: "replace"; fileName: string };

export type BulkUpdatePlanRow = {
  rowNumber: number;
  giItemName: string;
  dateOfIssue: string;
  status: "ok" | "not-found" | "ambiguous" | "invalid-date" | "missing-new-image";
  error?: string;
  matchCount?: number;
  coverId?: string;
  diffs?: FieldDiff[];
  updates?: Record<string, string | null>;
  imageChange?: ImageChange;
  postalCircleUnmapped?: boolean;
};

// Maps a CSV column to the covers column it updates. Deliberately excludes
// "Name of the GI Tag / Item" and "Date of Issue" — those two fields ARE
// the match key (see matching logic below), so this mechanism can never
// correct either of them: doing so would change which row it's even
// finding. A wrong GI name/date needs the existing manual single-row
// correction path instead — confirmed as an acceptable scope boundary
// before this was built, not an oversight.
const DIFFABLE_COLUMNS: { csvColumn: keyof CoverRow; dbColumn: string }[] = [
  { csvColumn: "Name of the Cover", dbColumn: "name_of_cover" },
  { csvColumn: "Product Category", dbColumn: "product_category" },
  { csvColumn: "Description of Cancellation", dbColumn: "cancellation_description" },
  { csvColumn: "Description of Cachet", dbColumn: "cachet_description" },
  { csvColumn: "Overall Description", dbColumn: "overall_description" },
  { csvColumn: "Place of Issue", dbColumn: "place_of_issue" },
];

// Pure — no Supabase calls, no Storage/network access — so it's directly
// unit-testable, same shape as computeBatchDuplicateFlags. The caller
// fetches `existing` and `circleIdByName` first (needs a live query) and
// performs any actual writes/uploads afterward based on this plan.
//
// Field-level diff, not full-row overwrite (confirmed with the product
// owner): a blank CSV value means "leave this field as-is," not "clear
// it" — a correction spreadsheet fixing 50 of 500 rows' one field each
// shouldn't blank out the other 499 columns' real data.
export function computeBulkUpdatePlan(
  rows: { rowNumber: number; data: CoverRow }[],
  existing: ExistingCoverForUpdate[],
  circleIdByName: Map<string, string>,
  availableImageFileNames: Set<string>
): BulkUpdatePlanRow[] {
  return rows.map(({ rowNumber, data }) => {
    const rawGiItem = data["Name of the GI Tag / Item"] ?? "";
    const rawDate = data["Date of Issue"] ?? "";
    const { cleanedName } = extractGiRegistrationNumber(rawGiItem);
    const dateResult = parseDateOfIssue(rawDate);

    if (!dateResult.ok) {
      return {
        rowNumber,
        giItemName: cleanedName,
        dateOfIssue: rawDate,
        status: "invalid-date",
        error: dateResult.error,
      };
    }

    const matches = existing.filter(
      (c) => c.gi_item_name === cleanedName && c.date_of_issue === dateResult.isoDate
    );

    if (matches.length === 0) {
      return { rowNumber, giItemName: cleanedName, dateOfIssue: dateResult.isoDate, status: "not-found" };
    }
    if (matches.length > 1) {
      return {
        rowNumber,
        giItemName: cleanedName,
        dateOfIssue: dateResult.isoDate,
        status: "ambiguous",
        matchCount: matches.length,
      };
    }

    const match = matches[0];
    const diffs: FieldDiff[] = [];
    const updates: Record<string, string | null> = {};

    for (const { csvColumn, dbColumn } of DIFFABLE_COLUMNS) {
      const newValue = data[csvColumn] ?? "";
      if (newValue.trim() === "") continue; // blank = leave as-is
      const oldValue = (match as unknown as Record<string, string | null>)[dbColumn];
      if (oldValue !== newValue) {
        diffs.push({ field: csvColumn, oldValue, newValue });
        updates[dbColumn] = newValue;
      }
    }

    let postalCircleUnmapped = false;
    const rawCircle = data["Issuing Postal Circle"] ?? "";
    if (rawCircle.trim() !== "") {
      const normalizedCircle = normalizePostalCircleName(rawCircle);
      const resolvedId = circleIdByName.get(normalizedCircle) ?? null;
      postalCircleUnmapped = resolvedId === null;
      if (resolvedId !== match.postal_circle_id) {
        diffs.push({ field: "Issuing Postal Circle", oldValue: match.postal_circle_id, newValue: normalizedCircle });
        updates.postal_circle_id = resolvedId;
      }
    }

    const rawImageFileName = (data["Image File Name"] ?? "").trim();
    let imageChange: ImageChange = { type: "none" };
    if (rawImageFileName !== "") {
      if (!availableImageFileNames.has(normalizeFileName(rawImageFileName))) {
        return {
          rowNumber,
          giItemName: cleanedName,
          dateOfIssue: dateResult.isoDate,
          status: "missing-new-image",
          error: `Image File Name "${rawImageFileName}" specified but no matching file was selected`,
        };
      }
      imageChange = { type: "replace", fileName: rawImageFileName };
    }

    return {
      rowNumber,
      giItemName: cleanedName,
      dateOfIssue: dateResult.isoDate,
      status: "ok",
      coverId: match.id,
      diffs,
      updates,
      imageChange,
      postalCircleUnmapped,
    };
  });
}
