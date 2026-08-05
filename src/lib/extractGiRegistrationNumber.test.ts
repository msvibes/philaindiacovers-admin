import { describe, expect, it } from "vitest";
import { extractGiRegistrationNumber } from "./extractGiRegistrationNumber";

describe("extractGiRegistrationNumber", () => {
  it("extracts a single GI number and strips it from the cleaned name", () => {
    // Real samples from PhilaIndiaCovers-Inventory-Ver 0.0.xlsx.
    expect(extractGiRegistrationNumber("Tezpur Litchi (GI No. 438)")).toEqual({
      cleanedName: "Tezpur Litchi",
      giRegistrationNumber: "438",
    });
    expect(extractGiRegistrationNumber("Miraj Sitar (GI No. 793)")).toEqual({
      cleanedName: "Miraj Sitar",
      giRegistrationNumber: "793",
    });
  });

  it("keeps the full matched content when a row embeds multiple numbers, rather than dropping data", () => {
    expect(extractGiRegistrationNumber("Assam Tea (Orthodox) (GI No. 115 & 118)")).toEqual({
      cleanedName: "Assam Tea (Orthodox)",
      giRegistrationNumber: "115 & 118",
    });
  });

  it("returns the trimmed original name with a null number when there's no GI No. annotation", () => {
    expect(extractGiRegistrationNumber("Rajasthani Puppets (Kathputli)")).toEqual({
      cleanedName: "Rajasthani Puppets (Kathputli)",
      giRegistrationNumber: null,
    });
  });

  it("is case-insensitive and tolerates a missing period after 'No'", () => {
    expect(extractGiRegistrationNumber("Some Item (gi no 12)")).toEqual({
      cleanedName: "Some Item",
      giRegistrationNumber: "12",
    });
  });

  it("collapses the double space left behind after stripping a trailing annotation", () => {
    expect(extractGiRegistrationNumber("Muga Silk of Assam (Logo)  (GI No. 384)")).toEqual({
      cleanedName: "Muga Silk of Assam (Logo)",
      giRegistrationNumber: "384",
    });
  });
});
