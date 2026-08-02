"use client";

import { useState } from "react";
import Papa from "papaparse";

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
};

// CSV/formula-injection defense: a cell opened by Excel/Sheets starting with
// =, +, -, or @ can execute as a formula. Strip any leading run of those
// characters before the value is used anywhere, including the preview.
function sanitizeCell(value: string): string {
  return value.replace(/^[=+\-@]+/, "");
}

export default function BulkImportPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handlePreview = () => {
    setParseError(null);
    setPreview(null);

    if (!csvFile) {
      setParseError("Choose a CSV file first.");
      return;
    }

    const imageFileNames = new Set(imageFiles.map((f) => f.name));

    Papa.parse<CoverRow>(csvFile, {
      header: true,
      skipEmptyLines: true,
      transform: sanitizeCell,
      complete: (results) => {
        if (results.errors.length > 0) {
          setParseError(results.errors[0].message);
          return;
        }
        const rows: PreviewRow[] = results.data.map((data, i) => ({
          rowNumber: i + 1,
          data,
          missingImage: !imageFileNames.has((data["Image File Name"] ?? "").trim()),
        }));
        setPreview(rows);
      },
      error: (err) => setParseError(err.message),
    });
  };

  const failureCount = preview?.filter((r) => r.missingImage).length ?? 0;

  return (
    <main className="mx-auto max-w-5xl p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bulk Import Covers</h1>
        <p className="text-sm text-gray-500">
          Upload a CSV and the referenced image files. This preview only
          checks that every row&apos;s image file was actually uploaded — no
          entries are created yet.
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
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          Preview Import
        </button>

        {parseError && <p className="text-red-600 text-sm">{parseError}</p>}
      </div>

      {preview && (
        <div className="space-y-2">
          <p className="text-sm">
            {preview.length} row{preview.length === 1 ? "" : "s"} parsed —{" "}
            {failureCount === 0
              ? "all image files found."
              : `${failureCount} row${failureCount === 1 ? "" : "s"} missing an image file.`}
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
                    className={row.missingImage ? "bg-red-50" : undefined}
                  >
                    <td className="px-3 py-2">{row.rowNumber}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.missingImage ? (
                        <span className="text-red-600 font-medium">
                          Missing image: {row.data["Image File Name"] || "(blank)"}
                        </span>
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
