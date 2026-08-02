import { describe, expect, it } from "vitest";
import { isDuplicateCover, type ExistingCoverKey } from "./isDuplicateCover";

const existing: ExistingCoverKey[] = [
  { gi_item_name: "Adamchini Chawal (Rice)", date_of_issue: "2023-05-19" },
  { gi_item_name: "Bandar Laddu", date_of_issue: "2021-11-15" },
  { gi_item_name: "Some Item With No Date", date_of_issue: null },
];

describe("isDuplicateCover", () => {
  it("flags an exact GI Item + Date of Issue match", () => {
    expect(isDuplicateCover("Adamchini Chawal (Rice)", "2023-05-19", existing)).toBe(
      true
    );
  });

  it("does not flag a different GI Item with the same date", () => {
    expect(isDuplicateCover("Some Other Item", "2023-05-19", existing)).toBe(false);
  });

  it("does not flag the same GI Item with a different date", () => {
    expect(isDuplicateCover("Adamchini Chawal (Rice)", "1999-01-01", existing)).toBe(
      false
    );
  });

  it("does not flag when the existing list is empty", () => {
    expect(isDuplicateCover("Adamchini Chawal (Rice)", "2023-05-19", [])).toBe(false);
  });

  it("does not flag blank GI Item or Date of Issue", () => {
    expect(isDuplicateCover("", "2023-05-19", existing)).toBe(false);
    expect(isDuplicateCover("Adamchini Chawal (Rice)", "", existing)).toBe(false);
    expect(isDuplicateCover("", "", existing)).toBe(false);
  });

  it("does not falsely match a blank incoming date against an existing null date", () => {
    expect(isDuplicateCover("Some Item With No Date", "", existing)).toBe(false);
  });
});
