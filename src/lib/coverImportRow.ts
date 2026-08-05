// Shared CSV column definition for the bulk-import flow (T-02/T-03/T-05) —
// imported by both the client preview and the server-side confirm-import
// route, so they can never drift apart into two independently-maintained
// column lists.
//
// Headers match the real import spreadsheet exactly (not database column
// names) — confirmed directly against PhilaIndiaCovers-Inventory-Ver 0.0.xlsx
// (287 real rows). Product Category exists as a column there but is 100%
// empty in the current data; read it if present, pass it through as-is,
// no validation (per T-05) — it isn't required or checked.
export const CSV_COLUMNS = [
  "Image File Name",
  "Name of the Cover",
  "Name of the GI Tag / Item",
  "Product Category",
  "Description of Cancellation",
  "Description of Cachet",
  "Overall Description",
  "Issuing Postal Circle",
  "Place of Issue",
  "Date of Issue",
] as const;

export type CoverColumn = (typeof CSV_COLUMNS)[number];
export type CoverRow = Record<CoverColumn, string>;
