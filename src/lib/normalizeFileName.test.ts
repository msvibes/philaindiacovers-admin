import { describe, expect, it } from "vitest";
import { normalizeFileName } from "./normalizeFileName";

// Both encodings of the accented character below are built from raw
// code points (String.fromCharCode), not typed as literal characters -
// a typed accented character can get silently normalized to one form
// or the other by an editor/tool before it ever reaches this file,
// which would make a test comparing them meaningless.
const NFC_E_ACUTE = String.fromCharCode(0x00e9); // precomposed e-acute (1 code unit)
const NFD_E_ACUTE = String.fromCharCode(0x0065) + String.fromCharCode(0x0301); // e + combining acute (2 code units)

describe("normalizeFileName", () => {
  it("leaves an already-NFC plain-ASCII name untouched", () => {
    expect(normalizeFileName("RajasthaniPuppetsKathputli.jpg")).toBe("RajasthaniPuppetsKathputli.jpg");
  });

  it("makes an NFC and an NFD encoding of the same visible name equal after normalizing both", () => {
    // Real case, found auditing the actual import spreadsheet: the CSV's
    // image filename used one precomposed accented character (NFC); the
    // real file on disk used a plain "e" followed by a separate
    // combining acute accent mark (NFD). Same visible character,
    // different bytes, so an exact string compare fails even though a
    // human reading either name sees no difference.
    const nfcName = "Khatwa" + "Appliqu" + NFC_E_ACUTE + ".jpg";
    const nfdName = "Khatwa" + "Appliqu" + NFD_E_ACUTE + ".jpg";
    expect(nfcName).not.toBe(nfdName); // sanity check: genuinely different strings before normalizing
    expect(nfcName.length).not.toBe(nfdName.length); // NFD is one code unit longer
    expect(normalizeFileName(nfcName)).toBe(normalizeFileName(nfdName));
  });

  it("handles an empty string safely", () => {
    expect(normalizeFileName("")).toBe("");
  });

  it("is idempotent - normalizing an already-normalized name is a no-op", () => {
    const once = normalizeFileName("Khatwa" + "Appliqu" + NFC_E_ACUTE + ".jpg");
    expect(normalizeFileName(once)).toBe(once);
  });
});
