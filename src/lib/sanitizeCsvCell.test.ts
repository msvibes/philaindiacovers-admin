import { describe, expect, it } from "vitest";
import { sanitizeCsvCell } from "./sanitizeCsvCell";

describe("sanitizeCsvCell", () => {
  it("leaves plain text untouched", () => {
    expect(sanitizeCsvCell("Normal text")).toBe("Normal text");
  });

  it("handles an empty string safely (real case: blank Product Category rows)", () => {
    expect(sanitizeCsvCell("")).toBe("");
  });

  it("handles null/undefined defensively, in case a future Papa Parse config change passes either for a blank cell", () => {
    expect(sanitizeCsvCell(null as unknown as string)).toBe("");
    expect(sanitizeCsvCell(undefined as unknown as string)).toBe("");
  });

  it("strips a leading dangerous character", () => {
    expect(sanitizeCsvCell("=cmd")).toBe("cmd");
    expect(sanitizeCsvCell("+cmd")).toBe("cmd");
    expect(sanitizeCsvCell("-cmd")).toBe("cmd");
    expect(sanitizeCsvCell("@cmd")).toBe("cmd");
  });

  it("does not touch a dangerous character that isn't leading", () => {
    expect(sanitizeCsvCell("cost -5")).toBe("cost -5");
    expect(sanitizeCsvCell("a=b")).toBe("a=b");
  });

  it("strips a leading space placed before a dangerous character", () => {
    expect(sanitizeCsvCell(" =cmd|'/c calc'!A1")).toBe("cmd|'/c calc'!A1");
    expect(sanitizeCsvCell("  ++malicious")).toBe("malicious");
    expect(sanitizeCsvCell(" - -@x")).toBe("x");
  });

  it("strips a leading tab or carriage return, alone or combined", () => {
    expect(sanitizeCsvCell("\t=cmd")).toBe("cmd");
    expect(sanitizeCsvCell("\r=cmd")).toBe("cmd");
    expect(sanitizeCsvCell("\t\r=cmd")).toBe("cmd");
    // A lone leading tab with no formula trigger is still whitespace-trimmed.
    expect(sanitizeCsvCell("\tplain tab only, no formula")).toBe(
      "plain tab only, no formula"
    );
  });

  it("strips nested/repeated leading runs", () => {
    expect(sanitizeCsvCell(" = =cmd")).toBe("cmd");
    expect(sanitizeCsvCell("==double")).toBe("double");
    expect(sanitizeCsvCell("--dash")).toBe("dash");
    expect(sanitizeCsvCell("   =nested")).toBe("nested");
  });
});
