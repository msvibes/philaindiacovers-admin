import { describe, expect, it } from "vitest";
import { computeBulkUpdatePlan, type ExistingCoverForUpdate } from "./computeBulkUpdatePlan";
import type { CoverRow } from "./coverImportRow";

function row(rowNumber: number, data: Partial<CoverRow>): { rowNumber: number; data: CoverRow } {
  const base: CoverRow = {
    "Image File Name": "",
    "Name of the Cover": "",
    "Name of the GI Tag / Item": "",
    "Product Category": "",
    "Description of Cancellation": "",
    "Description of Cachet": "",
    "Overall Description": "",
    "Issuing Postal Circle": "",
    "Place of Issue": "",
    "Date of Issue": "",
  };
  return { rowNumber, data: { ...base, ...data } };
}

const existingCover: ExistingCoverForUpdate = {
  id: "cover-1",
  gi_item_name: "Kullu Shawl",
  date_of_issue: "2021-10-20",
  name_of_cover: "Kullu Shawl",
  product_category: null,
  cancellation_description: "Old cancellation",
  cachet_description: "Old cachet",
  overall_description: "Old description",
  place_of_issue: "Kullu",
  postal_circle_id: "circle-hp-id",
  image_file: "uuid-1/KulluShawl.jpg",
};

const circleIdByName = new Map([["Himachal Pradesh", "circle-hp-id"], ["Karnataka", "circle-ka-id"]]);

describe("computeBulkUpdatePlan", () => {
  it("finds an exact match and reports no diffs when every CSV field is blank except the match key", () => {
    const plan = computeBulkUpdatePlan(
      [row(1, { "Name of the GI Tag / Item": "Kullu Shawl", "Date of Issue": "20/10/2021" })],
      [existingCover],
      circleIdByName,
      new Set()
    );
    expect(plan[0].status).toBe("ok");
    expect(plan[0].coverId).toBe("cover-1");
    expect(plan[0].diffs).toEqual([]);
    expect(plan[0].updates).toEqual({});
  });

  it("only overwrites fields with a non-blank CSV value — blank means leave as-is", () => {
    const plan = computeBulkUpdatePlan(
      [
        row(1, {
          "Name of the GI Tag / Item": "Kullu Shawl",
          "Date of Issue": "20/10/2021",
          "Place of Issue": "Corrected Kullu",
          // Description of Cancellation left blank — should NOT appear in diffs/updates
        }),
      ],
      [existingCover],
      circleIdByName,
      new Set()
    );
    expect(plan[0].status).toBe("ok");
    expect(plan[0].diffs).toEqual([{ field: "Place of Issue", oldValue: "Kullu", newValue: "Corrected Kullu" }]);
    expect(plan[0].updates).toEqual({ place_of_issue: "Corrected Kullu" });
  });

  it("does not report a diff when the non-blank CSV value equals the existing stored value", () => {
    const plan = computeBulkUpdatePlan(
      [
        row(1, {
          "Name of the GI Tag / Item": "Kullu Shawl",
          "Date of Issue": "20/10/2021",
          "Place of Issue": "Kullu", // same as existing
        }),
      ],
      [existingCover],
      circleIdByName,
      new Set()
    );
    expect(plan[0].diffs).toEqual([]);
  });

  it("reports not-found when no existing cover matches the GI Item + Date key", () => {
    const plan = computeBulkUpdatePlan(
      [row(1, { "Name of the GI Tag / Item": "Nonexistent Item", "Date of Issue": "01/01/2020" })],
      [existingCover],
      circleIdByName,
      new Set()
    );
    expect(plan[0].status).toBe("not-found");
  });

  it("reports ambiguous, with the match count, when two existing covers share the same GI Item + Date — real case: Kullu Shawl", () => {
    const secondMatch: ExistingCoverForUpdate = { ...existingCover, id: "cover-2", name_of_cover: "Kullu Shawl (Logo)" };
    const plan = computeBulkUpdatePlan(
      [row(1, { "Name of the GI Tag / Item": "Kullu Shawl", "Date of Issue": "20/10/2021" })],
      [existingCover, secondMatch],
      circleIdByName,
      new Set()
    );
    expect(plan[0].status).toBe("ambiguous");
    expect(plan[0].matchCount).toBe(2);
  });

  it("reports invalid-date for an unparseable Date of Issue, without attempting to match", () => {
    const plan = computeBulkUpdatePlan(
      [row(1, { "Name of the GI Tag / Item": "Kullu Shawl", "Date of Issue": "not-a-date" })],
      [existingCover],
      circleIdByName,
      new Set()
    );
    expect(plan[0].status).toBe("invalid-date");
  });

  it("resolves a new Issuing Postal Circle to its id and flags it unmapped when unrecognized", () => {
    const planMapped = computeBulkUpdatePlan(
      [
        row(1, {
          "Name of the GI Tag / Item": "Kullu Shawl",
          "Date of Issue": "20/10/2021",
          "Issuing Postal Circle": "Karnataka",
        }),
      ],
      [existingCover],
      circleIdByName,
      new Set()
    );
    expect(planMapped[0].updates).toEqual({ postal_circle_id: "circle-ka-id" });
    expect(planMapped[0].postalCircleUnmapped).toBe(false);

    const planUnmapped = computeBulkUpdatePlan(
      [
        row(1, {
          "Name of the GI Tag / Item": "Kullu Shawl",
          "Date of Issue": "20/10/2021",
          "Issuing Postal Circle": "Not A Real Circle",
        }),
      ],
      [existingCover],
      circleIdByName,
      new Set()
    );
    expect(planUnmapped[0].updates).toEqual({ postal_circle_id: null });
    expect(planUnmapped[0].postalCircleUnmapped).toBe(true);
  });

  it("leaves the image untouched when Image File Name is blank", () => {
    const plan = computeBulkUpdatePlan(
      [row(1, { "Name of the GI Tag / Item": "Kullu Shawl", "Date of Issue": "20/10/2021" })],
      [existingCover],
      circleIdByName,
      new Set()
    );
    expect(plan[0].imageChange).toEqual({ type: "none" });
  });

  it("plans a replace when Image File Name is set and a matching file was selected", () => {
    const plan = computeBulkUpdatePlan(
      [
        row(1, {
          "Name of the GI Tag / Item": "Kullu Shawl",
          "Date of Issue": "20/10/2021",
          "Image File Name": "NewKulluShawl.jpg",
        }),
      ],
      [existingCover],
      circleIdByName,
      new Set(["NewKulluShawl.jpg"])
    );
    expect(plan[0].status).toBe("ok");
    expect(plan[0].imageChange).toEqual({ type: "replace", fileName: "NewKulluShawl.jpg" });
  });

  it("reports missing-new-image when Image File Name is set but no matching file was selected", () => {
    const plan = computeBulkUpdatePlan(
      [
        row(1, {
          "Name of the GI Tag / Item": "Kullu Shawl",
          "Date of Issue": "20/10/2021",
          "Image File Name": "NotSelected.jpg",
        }),
      ],
      [existingCover],
      circleIdByName,
      new Set() // nothing selected
    );
    expect(plan[0].status).toBe("missing-new-image");
  });

  it("never diffs or updates gi_item_name or date_of_issue — the match key is not correctable via this path", () => {
    const plan = computeBulkUpdatePlan(
      [row(1, { "Name of the GI Tag / Item": "Kullu Shawl", "Date of Issue": "20/10/2021" })],
      [existingCover],
      circleIdByName,
      new Set()
    );
    expect(plan[0].updates).not.toHaveProperty("gi_item_name");
    expect(plan[0].updates).not.toHaveProperty("date_of_issue");
    expect((plan[0].diffs ?? []).some((d) => d.field === "Name of the GI Tag / Item")).toBe(false);
    expect((plan[0].diffs ?? []).some((d) => d.field === "Date of Issue")).toBe(false);
  });
});
