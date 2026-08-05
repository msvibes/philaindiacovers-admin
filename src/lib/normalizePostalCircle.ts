// T-05: the real import spreadsheet's "Issuing Postal Circle" values don't
// all exactly match the 23 official seeded names in `postal_circles`.
// Confirmed against the real 287-row source file directly: 25 unique
// values, 8 of which are variants of an official name rather than an
// official name itself. Documented in docs/Postal-Circles-Reference.md —
// keep both in sync if this table ever changes.
const POSTAL_CIRCLE_ALIASES: Record<string, string> = {
  "Bihar Circle": "Bihar",
  "Chhattisgarh Circle": "Chhattisgarh",
  "Jharkhand Circle": "Jharkhand",
  "J&K Circle": "Jammu and Kashmir",
  "North East": "North Eastern",
  "Arunachal Pradesh (North East)": "North Eastern",
  "Goa (Maharashtra Circle)": "Maharashtra",
  // Bare "Goa" isn't one of the 23 official circles — India Post
  // administers it under Maharashtra regardless of whether the source
  // data spells out "(Maharashtra Circle)" or not, so both forms map the
  // same way rather than treating the bare form as a different case.
  Goa: "Maharashtra",
};

// Returns the official circle name if `raw` is a known alias, otherwise
// returns `raw` unchanged (trimmed) — covers both an already-official
// name (passes through as-is for the caller's own exact-match lookup)
// and a genuinely unrecognized value (caller decides how to handle a
// non-match; this function doesn't guess).
export function normalizePostalCircleName(raw: string): string {
  const trimmed = raw.trim();
  return POSTAL_CIRCLE_ALIASES[trimmed] ?? trimmed;
}
