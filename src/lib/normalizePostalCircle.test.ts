import { describe, expect, it } from "vitest";
import { normalizePostalCircleName } from "./normalizePostalCircle";

describe("normalizePostalCircleName", () => {
  it("maps all 8 known variants to their official circle name", () => {
    expect(normalizePostalCircleName("Bihar Circle")).toBe("Bihar");
    expect(normalizePostalCircleName("Chhattisgarh Circle")).toBe("Chhattisgarh");
    expect(normalizePostalCircleName("Jharkhand Circle")).toBe("Jharkhand");
    expect(normalizePostalCircleName("J&K Circle")).toBe("Jammu and Kashmir");
    expect(normalizePostalCircleName("North East")).toBe("North Eastern");
    expect(normalizePostalCircleName("Arunachal Pradesh (North East)")).toBe("North Eastern");
    expect(normalizePostalCircleName("Goa (Maharashtra Circle)")).toBe("Maharashtra");
    expect(normalizePostalCircleName("Goa")).toBe("Maharashtra");
  });

  it("passes an already-official name through unchanged", () => {
    expect(normalizePostalCircleName("Tamil Nadu")).toBe("Tamil Nadu");
    expect(normalizePostalCircleName("Orissa")).toBe("Orissa");
  });

  it("passes an unrecognized value through unchanged, trimmed — doesn't guess", () => {
    expect(normalizePostalCircleName("  Made Up Circle  ")).toBe("Made Up Circle");
  });
});
