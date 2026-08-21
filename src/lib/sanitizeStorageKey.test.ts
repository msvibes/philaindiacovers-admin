import { describe, expect, it } from "vitest";
import { sanitizeStorageKey } from "./sanitizeStorageKey";

// Supabase's own key-safety regex (supabase/storage), used here to
// assert against the real constraint directly rather than just
// trusting sanitizeStorageKey's own idea of what's safe.
const SUPABASE_SAFE_KEY = /^(\w|\/|!|-|\.|\*|'|\(|\)| |&|\$|@|=|;|:|\+|,|\?)*$/;

// Both encodings of the accented character below are built from raw
// code points (String.fromCharCode), not typed as literal characters -
// a typed accented character can get silently normalized to one form
// or the other by an editor/tool before it ever reaches this file,
// which would make a test comparing them meaningless (see
// normalizeFileName.test.ts for the same convention, adopted there
// first after hitting this exact problem while authoring it).
const NFC_E_ACUTE = String.fromCharCode(0x00e9); // precomposed e-acute
const NFD_E_ACUTE = String.fromCharCode(0x0065) + String.fromCharCode(0x0301); // e + combining acute

describe("sanitizeStorageKey", () => {
  it("leaves an already-safe, plain-ASCII name untouched", () => {
    expect(sanitizeStorageKey("RajasthaniPuppetsKathputli.jpg")).toBe("RajasthaniPuppetsKathputli.jpg");
  });

  it("turns an NFC-encoded accented filename into a Supabase-safe key", () => {
    // Real case: row 25's filename matched correctly during preview
    // (normalizeFileName.ts), but the Storage upload itself rejected
    // the key with "Invalid key" - a separate, later failure.
    const nfcName = "Khatwa" + "Appliqu" + NFC_E_ACUTE + ".jpg";
    const sanitized = sanitizeStorageKey(nfcName);
    expect(SUPABASE_SAFE_KEY.test(sanitized)).toBe(true);
    expect(sanitized).toBe("KhatwaApplique.jpg");
  });

  it("turns an NFD-encoded accented filename into the SAME Supabase-safe key as its NFC equivalent", () => {
    const nfcName = "Khatwa" + "Appliqu" + NFC_E_ACUTE + ".jpg";
    const nfdName = "Khatwa" + "Appliqu" + NFD_E_ACUTE + ".jpg";
    expect(nfcName).not.toBe(nfdName); // sanity check: genuinely different strings before sanitizing
    expect(sanitizeStorageKey(nfcName)).toBe(sanitizeStorageKey(nfdName));
  });

  it("preserves every character Supabase's own regex explicitly allows", () => {
    const allowed = "a b&c$d(e)f'g+h,i;j:k=l?m*n-o.p_q/r!s";
    expect(sanitizeStorageKey(allowed)).toBe(allowed);
  });

  it("replaces a character outside both the diacritic case and the allowed set, rather than silently dropping it", () => {
    expect(sanitizeStorageKey("weird#hash%percent.jpg")).toBe("weird_hash_percent.jpg");
  });

  it("produces a Supabase-safe full storage path when combined with a UUID prefix, matching route.ts's real construction", () => {
    const uuid = "df9018b9-b5e8-4988-89fa-cff48a2e2848"; // the real uuid from the actual failed upload
    const imageFileName = "Khatwa" + "Appliqu" + NFC_E_ACUTE + ".jpg";
    const storagePath = `${uuid}/${sanitizeStorageKey(imageFileName)}`;
    expect(SUPABASE_SAFE_KEY.test(storagePath)).toBe(true);
  });

  it("handles an empty string safely", () => {
    expect(sanitizeStorageKey("")).toBe("");
  });
});
