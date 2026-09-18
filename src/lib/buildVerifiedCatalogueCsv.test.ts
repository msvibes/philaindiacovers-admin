import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import { buildVerifiedCatalogueCsv, type ExportableCover } from "./buildVerifiedCatalogueCsv";
import { CSV_COLUMNS } from "./coverImportRow";

const baseCover: ExportableCover = {
  name_of_cover: "Kullu Shawl",
  gi_item_name: "Kullu Shawl",
  product_category: null,
  cancellation_description: "Pictorial mountain and loom silhouette",
  cachet_description: "Textured fabric background",
  overall_description: "Celebrates the hand-woven shawls of Kullu Valley",
  place_of_issue: "Kullu",
  postal_circle_id: "circle-hp-id",
  date_of_issue: "2021-10-20",
};

const circleNameById = new Map([["circle-hp-id", "Himachal Pradesh"]]);

function parseBack(csv: string) {
  const result = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  return result.data;
}

describe("buildVerifiedCatalogueCsv", () => {
  it("uses the exact same header row as CSV_COLUMNS, in order — the shape /bulk-update expects", () => {
    const csv = buildVerifiedCatalogueCsv([baseCover], circleNameById);
    // Papa.unparse defaults to "\r\n" line endings, hence splitting on \r?\n.
    const headerLine = csv.split(/\r?\n/)[0];
    expect(headerLine).toBe(CSV_COLUMNS.join(","));
  });

  it("always leaves Image File Name blank, even though the cover has an image", () => {
    const csv = buildVerifiedCatalogueCsv([baseCover], circleNameById);
    const rows = parseBack(csv);
    expect(rows[0]["Image File Name"]).toBe("");
  });

  it("resolves postal_circle_id to the real circle name via the provided join", () => {
    const csv = buildVerifiedCatalogueCsv([baseCover], circleNameById);
    const rows = parseBack(csv);
    expect(rows[0]["Issuing Postal Circle"]).toBe("Himachal Pradesh");
  });

  it("leaves Issuing Postal Circle blank when postal_circle_id is null (unmapped), not a placeholder", () => {
    const unmapped: ExportableCover = { ...baseCover, postal_circle_id: null };
    const csv = buildVerifiedCatalogueCsv([unmapped], circleNameById);
    const rows = parseBack(csv);
    expect(rows[0]["Issuing Postal Circle"]).toBe("");
  });

  it("leaves Issuing Postal Circle blank when postal_circle_id doesn't resolve in the provided map", () => {
    const staleId: ExportableCover = { ...baseCover, postal_circle_id: "deleted-circle-id" };
    const csv = buildVerifiedCatalogueCsv([staleId], circleNameById);
    const rows = parseBack(csv);
    expect(rows[0]["Issuing Postal Circle"]).toBe("");
  });

  it("writes an empty string for a null column, e.g. Product Category", () => {
    const csv = buildVerifiedCatalogueCsv([baseCover], circleNameById);
    const rows = parseBack(csv);
    expect(rows[0]["Product Category"]).toBe("");
  });

  it("round-trips a Date of Issue value that /bulk-update's own date parser accepts unchanged (ISO, as stored)", () => {
    const csv = buildVerifiedCatalogueCsv([baseCover], circleNameById);
    const rows = parseBack(csv);
    expect(rows[0]["Date of Issue"]).toBe("2021-10-20");
  });

  it("properly escapes a value containing a comma and a quote, so the exported file remains valid CSV", () => {
    const messy: ExportableCover = {
      ...baseCover,
      overall_description: 'Issued for "Bandarpex", a regional exhibition',
    };
    const csv = buildVerifiedCatalogueCsv([messy], circleNameById);
    const rows = parseBack(csv);
    expect(rows[0]["Overall Description"]).toBe('Issued for "Bandarpex", a regional exhibition');
  });

  it("produces one row per cover, in the same order given", () => {
    const second: ExportableCover = { ...baseCover, name_of_cover: "Bidarpex Special Cover", gi_item_name: "Bidriware" };
    const csv = buildVerifiedCatalogueCsv([baseCover, second], circleNameById);
    const rows = parseBack(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]["Name of the Cover"]).toBe("Kullu Shawl");
    expect(rows[1]["Name of the Cover"]).toBe("Bidarpex Special Cover");
  });

  it("produces an empty-but-valid CSV (header only) for zero covers", () => {
    const csv = buildVerifiedCatalogueCsv([], circleNameById);
    const rows = parseBack(csv);
    expect(rows).toHaveLength(0);
  });
});
