import { describe, expect, it } from "vitest";
import { isDuplicateCoverRow, computeBatchDuplicateFlags } from "./isDuplicateCoverRow";
import type { ExistingCoverKey } from "./isDuplicateCover";

const existing: ExistingCoverKey[] = [
  { gi_item_name: "Bandar Laddu", date_of_issue: "2021-11-15" },
  { gi_item_name: "Adamchini Chawal (Rice)", date_of_issue: "2023-05-19" },
  // Stored exactly as inserted — extractGiRegistrationNumber() strips
  // "(GI No. ...)" but does NOT recognize "(GI Code: ...)", so this one
  // is stored with the annotation still in the name (see
  // extractGiRegistrationNumber.ts's own pattern).
  { gi_item_name: "Kaji Nemu (GI Code: 609)", date_of_issue: "2021-08-25" },
];

describe("isDuplicateCoverRow", () => {
  it("flags a real, live regression: a raw DD/MM/YYYY CSV date against an existing ISO date", () => {
    // The actual bug, the actual data: row 9 of the real 287-row import
    // (Bandar Laddu) was already a real "draft" cover in the database
    // (date_of_issue "2021-11-15") when the same row was previewed again
    // from the raw CSV ("15/11/2021"). isDuplicateCover() alone missed
    // this — exact string match, "15/11/2021" !== "2021-11-15" — which is
    // exactly why the import preview reported "no issues" for a batch
    // that had 24 real, already-existing duplicates in it.
    expect(isDuplicateCoverRow("Bandar Laddu", "15/11/2021", existing)).toBe(true);
  });

  it("flags the same real case in its DD.MM.YYYY free-text form too", () => {
    expect(isDuplicateCoverRow("Bandar Laddu", "15.11.2021", existing)).toBe(true);
  });

  it("flags a real date already in ISO form (e.g. a re-parsed or previously-cleaned value)", () => {
    expect(isDuplicateCoverRow("Adamchini Chawal (Rice)", "2023-05-19", existing)).toBe(true);
  });

  it("flags a second real, live regression: a raw GI Tag/Item embedding a (GI No. ...) annotation the database name never had", () => {
    // Real case, found re-verifying the date fix against all 24 real
    // existing rows: row 12 (Tezpur Litchi) is stored as plain "Tezpur
    // Litchi" — /api/confirm-import always strips "(GI No. 438)" via
    // extractGiRegistrationNumber() before inserting. The preview was
    // still comparing the raw, un-stripped CSV text, so this row (and 4
    // others with the same "(GI No. ...)" shape) stayed silently missed
    // even after the date fix alone.
    const tezpurExisting: ExistingCoverKey[] = [{ gi_item_name: "Tezpur Litchi", date_of_issue: "2021-08-26" }];
    expect(isDuplicateCoverRow("Tezpur Litchi (GI No. 438)", "26/8/2021", tezpurExisting)).toBe(true);
  });

  it("flags a real GI Tag/Item with two embedded numbers, matching extractGiRegistrationNumber's own real-data case", () => {
    const assamExisting: ExistingCoverKey[] = [{ gi_item_name: "Assam Tea (Orthodox)", date_of_issue: "2021-08-24" }];
    expect(isDuplicateCoverRow("Assam Tea (Orthodox) (GI No. 115 & 118)", "24/8/2021", assamExisting)).toBe(true);
  });

  it("does NOT strip a \"(GI Code: ...)\" annotation — only \"(GI No. ...)\" is recognized, matching extractGiRegistrationNumber exactly", () => {
    // Confirms this function defers entirely to extractGiRegistrationNumber
    // rather than doing its own, possibly-inconsistent stripping — the
    // real Kaji Nemu row is stored WITH "(GI Code: 609)" still in the
    // name precisely because that phrasing was never stripped server-side
    // either.
    expect(isDuplicateCoverRow("Kaji Nemu (GI Code: 609)", "25/8/2021", existing)).toBe(true);
    expect(isDuplicateCoverRow("Kaji Nemu", "25/8/2021", existing)).toBe(false);
  });

  it("does not flag a different GI Item with the same underlying date", () => {
    expect(isDuplicateCoverRow("Some Other Item", "15/11/2021", existing)).toBe(false);
  });

  it("does not flag the same GI Item with a genuinely different date", () => {
    expect(isDuplicateCoverRow("Bandar Laddu", "16/11/2021", existing)).toBe(false);
  });

  it("does not flag, and does not throw, when the date is unparseable", () => {
    expect(isDuplicateCoverRow("Bandar Laddu", "not a date", existing)).toBe(false);
  });

  it("does not flag when the date is blank", () => {
    expect(isDuplicateCoverRow("Bandar Laddu", "", existing)).toBe(false);
  });

  it("does not flag when the existing list is empty", () => {
    expect(isDuplicateCoverRow("Bandar Laddu", "15/11/2021", [])).toBe(false);
  });
});

describe("computeBatchDuplicateFlags", () => {
  it("flags a real, live regression: two rows in the SAME csv batch sharing GI Item + Date of Issue, neither pre-existing in the database", () => {
    // The actual bug, the actual data: real 287-row import, rows 47 and
    // 48. Both rows' "Name of the GI Tag / Item" is the identical literal
    // text "Kullu Shawl" and both are dated 20/10/2021 — they differ only
    // in "Name of the Cover" ("Kullu Shawl" vs "Kullu Shawl (Logo)"),
    // which is not part of the duplicate key at all. Neither was in the
    // database beforehand (existing: []). The preview showed BOTH as OK,
    // since it checked each row only against the fixed, DB-fetched
    // `existing` list. /api/confirm-import's own loop (which already
    // tracked same-batch inserts via existing.push()) correctly created
    // row 47 then rejected row 48 as a duplicate of it — this is the
    // preview gap that closes.
    const flags = computeBatchDuplicateFlags(
      [
        { giItemName: "Kullu Shawl", dateOfIssue: "20/10/2021", missingImage: false },
        { giItemName: "Kullu Shawl", dateOfIssue: "20/10/2021", missingImage: false },
      ],
      []
    );
    expect(flags).toEqual([false, true]);
  });

  it("still flags a row matching a genuinely pre-existing database row, independent of any within-batch collision", () => {
    const existing: ExistingCoverKey[] = [{ gi_item_name: "Bandar Laddu", date_of_issue: "2021-11-15" }];
    const flags = computeBatchDuplicateFlags(
      [{ giItemName: "Bandar Laddu", dateOfIssue: "15/11/2021", missingImage: false }],
      existing
    );
    expect(flags).toEqual([true]);
  });

  it("a third row matching the first two also gets flagged, not just the second", () => {
    const flags = computeBatchDuplicateFlags(
      [
        { giItemName: "Kullu Shawl", dateOfIssue: "20/10/2021", missingImage: false },
        { giItemName: "Kullu Shawl", dateOfIssue: "20/10/2021", missingImage: false },
        { giItemName: "Kullu Shawl", dateOfIssue: "20/10/2021", missingImage: false },
      ],
      []
    );
    expect(flags).toEqual([false, true, true]);
  });

  it("a row with a missing image never contributes its key — mirrors /api/confirm-import skipping the missing-image row before it would ever reach existing.push()", () => {
    const flags = computeBatchDuplicateFlags(
      [
        { giItemName: "Kullu Shawl", dateOfIssue: "20/10/2021", missingImage: true },
        { giItemName: "Kullu Shawl", dateOfIssue: "20/10/2021", missingImage: false },
      ],
      []
    );
    // First row is itself not a duplicate (nothing existing yet) despite
    // its missing image — missingImage and duplicate are independent
    // flags. What matters here is the SECOND row: had the first row's key
    // been pushed anyway, this would wrongly be true.
    expect(flags).toEqual([false, false]);
  });

  it("a row with an unparseable date never contributes its key, matching computeCoverKey's own null result for that case", () => {
    const flags = computeBatchDuplicateFlags(
      [
        { giItemName: "Kullu Shawl", dateOfIssue: "not a date", missingImage: false },
        { giItemName: "Kullu Shawl", dateOfIssue: "20/10/2021", missingImage: false },
      ],
      []
    );
    expect(flags).toEqual([false, false]);
  });

  it("does not mutate the existing array passed in", () => {
    const existing: ExistingCoverKey[] = [{ gi_item_name: "Bandar Laddu", date_of_issue: "2021-11-15" }];
    const existingCopy = [...existing];
    computeBatchDuplicateFlags(
      [{ giItemName: "Kullu Shawl", dateOfIssue: "20/10/2021", missingImage: false }],
      existing
    );
    expect(existing).toEqual(existingCopy);
  });
});
