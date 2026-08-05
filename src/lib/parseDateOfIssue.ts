// T-05: parses "Date of Issue" values from the real import spreadsheet.
//
// Confirmed empirically against the actual source file (287 real rows,
// checked directly, not assumed): every value is day-first. Real Excel
// date cells export as D/M/YYYY (214/287 rows have a first number >12,
// which is only possible if day comes first) and free-typed text cells
// use DD.MM.YYYY (dot-separated) — same day-first order, different
// separator. Today's snapshot has zero blank/unparseable dates, but this
// still handles both shapes plus blanks defensively: the spreadsheet gets
// added to over time, and there's no guarantee every future entry is
// typed in cleanly.
//
// The day-first conclusion is about DISPLAY FORMAT, not just proof that
// the underlying VALUES are right — a separate risk is whether whatever
// process converted an earlier snapshot's free-text DD.MM.YYYY dates into
// this file's "clean" Excel dates preserved day/month order correctly.
// Checked exhaustively (not sampled): all 140 of the earlier snapshot's
// free-text rows cross-referenced against this file by Image File Name —
// zero mismatches. See PROGRESS.md (2026-08-05) for the full result.
export type DateParseResult = { ok: true; isoDate: string } | { ok: false; error: string };

function toIsoDate(day: number, month: number, year: number, original: string): DateParseResult {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, error: `Invalid date components in "${original}"` };
  }
  // Round-trip through a real Date to reject invalid calendar dates (e.g.
  // Feb 30) that pass the loose range check above.
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { ok: false, error: `Invalid calendar date in "${original}"` };
  }
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return { ok: true, isoDate: `${year}-${mm}-${dd}` };
}

export function parseDateOfIssue(raw: string): DateParseResult {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return { ok: false, error: "Date of Issue is blank" };
  }

  // Already ISO — e.g. from a previously-cleaned test fixture.
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return toIsoDate(Number(iso[3]), Number(iso[2]), Number(iso[1]), trimmed);
  }

  // Free-typed text: DD.MM.YYYY (dot-separated, day-first).
  const dot = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dot) {
    return toIsoDate(Number(dot[1]), Number(dot[2]), Number(dot[3]), trimmed);
  }

  // Real Excel date exported to CSV: D/M/YYYY or D/M/YY (slash, day-first).
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]);
    let year = Number(slash[3]);
    if (slash[3].length === 2) {
      // Matches Excel's own 2-digit-year pivot convention.
      year = year <= 68 ? 2000 + year : 1900 + year;
    }
    return toIsoDate(day, month, year, trimmed);
  }

  return { ok: false, error: `Unrecognized date format: "${trimmed}"` };
}
