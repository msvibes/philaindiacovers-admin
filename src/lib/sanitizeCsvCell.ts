// CSV/formula-injection defense (OWASP): a cell opened by Excel/Sheets
// starting with =, +, -, @, a tab (0x09), or a carriage return (0x0D) can
// execute as a formula. `\s` below already covers tab and CR, plus all
// other whitespace, so leading-space evasions like " =cmd..." are also
// neutralized.
//
// This is a trust-boundary control, not a UI nicety: client-side use (the
// import preview) is convenience only. Every path that writes CSV-derived
// values — including the T-05 bulk-import Edge Function — must call this
// same function before persisting or displaying a cell. Do not
// re-implement this logic separately; import it.
export function sanitizeCsvCell(value: string): string {
  // Defensive guard: the type signature says `string`, but a Papa Parse
  // config change (or any other future caller) could pass null/undefined
  // for a blank cell. Fail safe to "" rather than throwing mid-import.
  if (value == null) return "";

  let result = value;
  let previous: string;
  do {
    previous = result;
    result = result.replace(/^\s+/, "").replace(/^[=+\-@]+/, "");
  } while (result !== previous);
  return result;
}
