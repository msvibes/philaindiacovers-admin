// Mirrors the covers table's own duplicate-check contract (see "Bulk import"
// in docs/API-Integration-Contracts.md): GI Item + Date of Issue, matched
// against existing covers of ANY verification_status, not just verified.
//
// Kept dependency-free (no Supabase client import) so it's testable without
// env vars or network access — see checkDuplicateCovers.ts for the fetch
// that supplies `existing`.
export type ExistingCoverKey = {
  gi_item_name: string | null;
  date_of_issue: string | null;
};

// Exact string match on both fields. Note: date_of_issue in an incoming CSV
// row is whatever raw text the spreadsheet has, while existing rows' dates
// come back from Postgres as canonical ISO ("YYYY-MM-DD"). This only
// catches a duplicate when the CSV's date is already in that same format —
// the same known limitation flagged for T-05's date parsing (see
// PROGRESS.md); it is not solved here.
export function isDuplicateCover(
  giItemName: string,
  dateOfIssue: string,
  existing: ExistingCoverKey[]
): boolean {
  if (!giItemName || !dateOfIssue) return false;
  return existing.some(
    (c) => c.gi_item_name === giItemName && c.date_of_issue === dateOfIssue
  );
}
