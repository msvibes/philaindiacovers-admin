import { describe, expect, it } from "vitest";
import { parseDateOfIssue } from "./parseDateOfIssue";

describe("parseDateOfIssue", () => {
  it("parses real Excel-date exports (slash-separated, day-first)", () => {
    // Real samples from PhilaIndiaCovers-Inventory-Ver 0.0.xlsx.
    expect(parseDateOfIssue("11/11/1981")).toEqual({ ok: true, isoDate: "1981-11-11" });
    expect(parseDateOfIssue("31/10/1976")).toEqual({ ok: true, isoDate: "1976-10-31" });
    expect(parseDateOfIssue("4/1/2008")).toEqual({ ok: true, isoDate: "2008-01-04" });
    expect(parseDateOfIssue("14/9/2021")).toEqual({ ok: true, isoDate: "2021-09-14" });
  });

  it("parses 2-digit years using Excel's own pivot convention", () => {
    expect(parseDateOfIssue("11/11/81")).toEqual({ ok: true, isoDate: "1981-11-11" });
    expect(parseDateOfIssue("31/10/76")).toEqual({ ok: true, isoDate: "1976-10-31" });
    expect(parseDateOfIssue("1/4/08")).toEqual({ ok: true, isoDate: "2008-04-01" });
  });

  it("parses free-typed dot-separated text (day-first), the earlier snapshot's messy case", () => {
    expect(parseDateOfIssue("05.09.2021")).toEqual({ ok: true, isoDate: "2021-09-05" });
    expect(parseDateOfIssue("15.08.2021")).toEqual({ ok: true, isoDate: "2021-08-15" });
    expect(parseDateOfIssue("24.11.2018")).toEqual({ ok: true, isoDate: "2018-11-24" });
  });

  it("passes through already-ISO dates", () => {
    expect(parseDateOfIssue("2023-05-19")).toEqual({ ok: true, isoDate: "2023-05-19" });
  });

  it("treats a blank date as a failure, not a silent NULL", () => {
    expect(parseDateOfIssue("")).toEqual({ ok: false, error: "Date of Issue is blank" });
    expect(parseDateOfIssue("   ")).toEqual({ ok: false, error: "Date of Issue is blank" });
  });

  it("rejects invalid calendar dates (e.g. Feb 30) rather than silently correcting them", () => {
    const result = parseDateOfIssue("30.02.2021");
    expect(result.ok).toBe(false);
  });

  it("rejects out-of-range month/day components", () => {
    expect(parseDateOfIssue("32/13/2021").ok).toBe(false);
  });

  it("rejects genuinely unrecognized formats", () => {
    expect(parseDateOfIssue("sometime in 2021").ok).toBe(false);
    expect(parseDateOfIssue("2021/09/05/extra").ok).toBe(false);
  });
});
