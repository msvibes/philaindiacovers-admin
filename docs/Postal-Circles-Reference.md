# Official Postal Circle List — PhilaIndiaCovers

Verified directly against India Post's own site (https://www.indiapost.gov.in/rti/structureofcircle), not a third-party summary. This is the exact, authoritative 23-circle list to use as the fixed dropdown values for the "Issuing Postal Circle" field.

1. Andhra Pradesh
2. Assam
3. Bihar
4. Chhattisgarh
5. Delhi
6. Gujarat
7. Haryana
8. Himachal Pradesh
9. Jammu and Kashmir
10. Jharkhand
11. Karnataka
12. Kerala
13. Madhya Pradesh
14. Maharashtra
15. North Eastern
16. Orissa
17. Punjab
18. Rajasthan
19. Tamil Nadu
20. Telangana
21. Uttar Pradesh
22. Uttarakhand
23. West Bengal

## Two Naming Quirks to Preserve Exactly

Do not "correct" these toward more common usage — India Post's own list uses these exact names:

- **"Orissa"** — not "Odisha" (India Post's own list still uses the older name)
- **"North Eastern"** — not "North East"

## Note on Scope

Pages beyond the 23rd circle on India Post's site are internal Directorate divisions and training academies (CEPT Mysore, PTC Darbanga, RAKNPA Ghaziabad, etc.) — not geographic circles, and not relevant to this list.

## Known Variant Names in the Real Import Spreadsheet (T-05)

Confirmed directly against `PhilaIndiaCovers-Inventory-Ver 0.0.xlsx` (287 real rows): the "Issuing Postal Circle" column has 25 unique values, 8 of which are variants of an official name above rather than the official name itself. Normalized during import (`src/lib/normalizePostalCircle.ts`) before looking up `postal_circle_id` — keep this table and that file in sync if new variants ever show up.

| Spreadsheet value | Maps to |
|---|---|
| `Bihar Circle` | Bihar |
| `Chhattisgarh Circle` | Chhattisgarh |
| `Jharkhand Circle` | Jharkhand |
| `J&K Circle` | Jammu and Kashmir |
| `North East` | North Eastern |
| `Arunachal Pradesh (North East)` | North Eastern |
| `Goa (Maharashtra Circle)` | Maharashtra |
| `Goa` | Maharashtra |

**On bare "Goa":** Goa isn't one of the 23 official circles — India Post administers it under Maharashtra. Both `"Goa"` and `"Goa (Maharashtra Circle)"` map the same way; the parenthetical is treated as optional clarifying detail, not a different classification.

**On values not in this table:** a spreadsheet value that's neither an exact match to one of the 23 official names nor a known variant above resolves to `postal_circle_id = NULL` rather than blocking the whole row — the field is nullable and admin-correctable, unlike a missing image file or an unparseable date. The per-row import report flags it so it doesn't go unnoticed.
