"use client";

import { useState } from "react";
import Papa from "papaparse";
import { sanitizeCsvCell } from "@/lib/sanitizeCsvCell";
import { fetchExistingCoverKeys } from "@/lib/checkDuplicateCovers";
import { isDuplicateCover } from "@/lib/isDuplicateCover";

// Headers match the real import spreadsheet exactly (not database column
// names) — see ../Data/PhilaIndiaCovers-PLabs.xlsx for the source format.
const CSV_COLUMNS = [
  "Image File Name",
  "Name of the Cover",
  "Name of the GI Tag / Item",
  "Product Category",
  "Description of Cancellation",
  "Description of Cachet",
  "Overall Description",
  "Issuing Postal Circle",
  "Place of Issue",
  "Date of Issue",
] as const;

type CoverColumn = (typeof CSV_COLUMNS)[number];
type CoverRow = Record<CoverColumn, string>;

type PreviewRow = {
  rowNumber: number;
  data: CoverRow;
  missingImage: boolean;
  duplicate: boolean;
};

export default function BulkImportPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handlePreview = () => {
    setParseError(null);
    setPreview(null);

    if (!csvFile) {
      setParseError("Choose a CSV file first.");
      return;
    }

    const imageFileNames = new Set(imageFiles.map((f) => f.name));
    setIsChecking(true);

    Papa.parse<CoverRow>(csvFile, {
      header: true,
      skipEmptyLines: true,
      transform: sanitizeCsvCell,
      complete: async (results) => {
        if (results.errors.length > 0) {
          setParseError(results.errors[0].message);
          setIsChecking(false);
          return;
        }

        const giItemNames = Array.from(
          new Set(
            results.data
              .map((row) => row["Name of the GI Tag / Item"])
              .filter((v): v is string => Boolean(v))
          )
        );

        let existing;
        try {
          existing = await fetchExistingCoverKeys(giItemNames);
        } catch (err) {
          setParseError(
            `Could not check for duplicates: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
          setIsChecking(false);
          return;
        }

        const rows: PreviewRow[] = results.data.map((data, i) => ({
          rowNumber: i + 1,
          data,
          missingImage: !imageFileNames.has((data["Image File Name"] ?? "").trim()),
          duplicate: isDuplicateCover(
            data["Name of the GI Tag / Item"] ?? "",
            data["Date of Issue"] ?? "",
            existing
          ),
        }));
        setPreview(rows);
        setIsChecking(false);
      },
      error: (err) => {
        setParseError(err.message);
        setIsChecking(false);
      },
    });
  };

  const missingImageCount = preview?.filter((r) => r.missingImage).length ?? 0;
  const duplicateCount = preview?.filter((r) => r.duplicate).length ?? 0;

  return (
    <main className="mx-auto max-w-5xl p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bulk Import Covers</h1>
        <p className="text-sm text-gray-500">
          Upload a CSV and the referenced image files. This preview checks
          for missing image files and likely duplicates (GI Item + Date of
          Issue matching an existing cover of any status) — no entries are
          created yet.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border p-6">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="csv-input">
            CSV file
          </label>
          <input
            id="csv-input"
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="images-input">
            Cover images
          </label>
          <input
            id="images-input"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
          />
          {imageFiles.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              {imageFiles.length} image{imageFiles.length === 1 ? "" : "s"} selected
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handlePreview}
          disabled={isChecking}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isChecking ? "Checking…" : "Preview Import"}
        </button>

        {parseError && <p className="text-red-600 text-sm">{parseError}</p>}
      </div>

      {preview && (
        <div className="space-y-2">
          <p className="text-sm">
            {preview.length} row{preview.length === 1 ? "" : "s"} parsed —{" "}
            {missingImageCount === 0 && duplicateCount === 0
              ? "no issues found."
              : [
                  missingImageCount > 0
                    ? `${missingImageCount} row${missingImageCount === 1 ? "" : "s"} missing an image file`
                    : null,
                  duplicateCount > 0
                    ? `${duplicateCount} likely duplicate${duplicateCount === 1 ? "" : "s"}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(", ") + "."}
          </p>

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  {CSV_COLUMNS.map((col) => (
                    <th key={col} className="px-3 py-2 text-left whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={
                      row.missingImage || row.duplicate ? "bg-red-50" : undefined
                    }
                  >
                    <td className="px-3 py-2">{row.rowNumber}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.missingImage || row.duplicate ? (
                        <div className="space-y-0.5">
                          {row.missingImage && (
                            <div className="text-red-600 font-medium">
                              Missing image: {row.data["Image File Name"] || "(blank)"}
                            </div>
                          )}
                          {row.duplicate && (
                            <div className="text-amber-700 font-medium">
                              Likely duplicate
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-green-700">OK</span>
                      )}
                    </td>
                    {CSV_COLUMNS.map((col) => (
                      <td key={col} className="px-3 py-2 whitespace-nowrap">
                        {row.data[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
