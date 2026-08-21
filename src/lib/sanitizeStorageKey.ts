// Supabase Storage (S3-compatible) restricts object keys to a specific
// ASCII-safe character set - confirmed against Supabase's own validation
// regex (supabase/storage), not guessed: word characters (\w), "/", and
// ! - . * ' ( ) space & $ @ = ; : + , ?
//
// An accented character (present in real source data, e.g. an item
// name containing a French-loanword accented letter) fails this check
// regardless of Unicode normalization form - neither encoding of an
// accented letter is a \w character - producing a real "Invalid key"
// Storage upload failure, not a cosmetic one. Found for real importing
// the actual 287-row spreadsheet: row 25's filename matched correctly
// during preview (normalizeFileName.ts already fixed that), but the
// Storage upload itself then rejected the key.
//
// This is a DIFFERENT concern from normalizeFileName.ts and runs at a
// different, later step: normalizeFileName.ts makes an already-real
// filename matchable against an uploaded File's name; this function
// turns an already-matched real filename into a key Storage will
// actually accept. Only the Storage upload path needs this - the
// original filename used for matching, or shown anywhere the human-
// readable name matters, should stay untouched.
const SUPABASE_STORAGE_KEY_UNSAFE = /[^\w/!\-.*'() &$@=;:+,?]/g;

// Unicode "Combining Diacritical Marks" block. Checked by numeric code
// point range rather than a regex range built from typed/generated
// combining-mark characters - a regex literal embedding the characters
// themselves is exactly the kind of thing an editor, formatter, or even
// this file's own authoring process can silently mangle (this bit the
// sibling normalizeFileName.test.ts once already, the hard way). Using
// plain integer comparison means no combining-mark character or Unicode
// escape sequence needs to exist anywhere in this file's own text.
const COMBINING_MARK_START = 0x0300;
const COMBINING_MARK_END = 0x036f;

function isCombiningMark(codePoint: number): boolean {
  return codePoint >= COMBINING_MARK_START && codePoint <= COMBINING_MARK_END;
}

export function sanitizeStorageKey(name: string): string {
  // NFD-decompose first (splits an accented letter into its base letter
  // + a separate combining mark), then drop the combining marks - turns
  // an accented letter (either NFC or NFD to start) into its plain base
  // letter, not a dropped character.
  const withoutDiacritics = Array.from(name.normalize("NFD"))
    .filter((ch) => !isCombiningMark(ch.codePointAt(0) ?? 0))
    .join("");
  // Backstop for anything left that still isn't Storage-safe (a
  // non-Latin script, a stray symbol) - replaced, not silently dropped,
  // so a sanitized key stays traceable back to its source name.
  return withoutDiacritics.replace(SUPABASE_STORAGE_KEY_UNSAFE, "_");
}
