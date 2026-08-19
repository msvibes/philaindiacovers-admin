// A filename containing an accented character can be encoded two
// different ways at the byte level even when it looks identical: NFC
// (one precomposed codepoint, e.g. "é") or NFD ("e" + a separate
// combining accent mark). Different tools/platforms don't agree on
// which form they produce, so a CSV-derived name and the corresponding
// uploaded File's `.name` can be visually identical but fail an exact
// string comparison. Found for real via "KhatwaAppliqué.jpg" during
// pre-import auditing — the CSV used NFC, the actual file on disk used
// NFD.
//
// Every place that matches a CSV-derived image filename against an
// uploaded file's name must normalize both sides through this function
// first, rather than comparing raw strings. Do not re-implement this
// logic separately; import it.
export function normalizeFileName(name: string): string {
  return name.normalize("NFC");
}
