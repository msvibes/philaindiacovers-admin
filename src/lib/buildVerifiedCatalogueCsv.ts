import Papa from "papaparse";
import { CSV_COLUMNS, type CoverRow } from "./coverImportRow";

export type ExportableCover = {
  name_of_cover: string | null;
  gi_item_name: string | null;
  product_category: string | null;
  cancellation_description: string | null;
  cachet_description: string | null;
  overall_description: string | null;
  place_of_issue: string | null;
  postal_circle_id: string | null;
  date_of_issue: string | null;
};

// Builds a CSV in the exact shape /bulk-update expects as input (same
// headers, same order — CSV_COLUMNS, the single shared source both pages
// use) so the loop is genuinely export -> edit a few cells -> re-upload
// with zero reformatting. Reuses Papa.unparse (already a dependency)
// rather than hand-rolling CSV escaping.
//
// "Image File Name" is always left blank, deliberately — covers.image_file
// stores a Storage path (uuid/sanitized-name.jpg), not the original
// filename an admin could ever re-select. Exporting it would either fail
// to match any real file on reimport, or worse, /bulk-update would read a
// populated value as an explicit "replace this image" instruction. Blank
// is exactly what /bulk-update already treats as "leave the image
// untouched" — the correct round-trip behavior, not a limitation.
//
// "Issuing Postal Circle" is resolved via a join the caller provides
// (covers only stores postal_circle_id) and left blank when unmapped,
// for the same reason: blank round-trips as "no change," a placeholder
// value would not.
export function buildVerifiedCatalogueCsv(
  covers: ExportableCover[],
  circleNameById: Map<string, string>
): string {
  const rows: CoverRow[] = covers.map((cover) => ({
    "Image File Name": "",
    "Name of the Cover": cover.name_of_cover ?? "",
    "Name of the GI Tag / Item": cover.gi_item_name ?? "",
    "Product Category": cover.product_category ?? "",
    "Description of Cancellation": cover.cancellation_description ?? "",
    "Description of Cachet": cover.cachet_description ?? "",
    "Overall Description": cover.overall_description ?? "",
    "Issuing Postal Circle": cover.postal_circle_id
      ? (circleNameById.get(cover.postal_circle_id) ?? "")
      : "",
    "Place of Issue": cover.place_of_issue ?? "",
    "Date of Issue": cover.date_of_issue ?? "",
  }));

  return Papa.unparse({ fields: [...CSV_COLUMNS], data: rows });
}
