// T-05: gi_registration_number is not its own CSV column — it's embedded
// in "Name of the GI Tag / Item" text, e.g. "Tezpur Litchi (GI No. 438)".
// Captures everything between "GI No." and the closing paren, not just a
// single number: the real source data has at least one row with two
// ("Assam Tea (Orthodox) (GI No. 115 & 118)"), and gi_registration_number
// is a single text field — dropping the second number would lose real
// data, so the full matched content is kept as-is.
const GI_NUMBER_PATTERN = /\(\s*GI\s*No\.?\s*([^)]+)\)/i;

export type ExtractedGiInfo = {
  cleanedName: string;
  giRegistrationNumber: string | null;
};

export function extractGiRegistrationNumber(giItemText: string): ExtractedGiInfo {
  const match = giItemText.match(GI_NUMBER_PATTERN);
  if (!match) {
    return { cleanedName: giItemText.trim(), giRegistrationNumber: null };
  }
  const giRegistrationNumber = match[1].trim();
  const cleanedName = giItemText.replace(GI_NUMBER_PATTERN, "").replace(/\s+/g, " ").trim();
  return { cleanedName, giRegistrationNumber };
}
