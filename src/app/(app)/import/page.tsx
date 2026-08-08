"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { supabaseBrowser } from "@/lib/supabaseBrowserClient";
import { sanitizeCsvCell } from "@/lib/sanitizeCsvCell";
import { fetchExistingCoverKeys } from "@/lib/checkDuplicateCovers";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { isDuplicateCover } from "@/lib/isDuplicateCover";
import { parseDateOfIssue } from "@/lib/parseDateOfIssue";
import { CSV_COLUMNS, type CoverRow } from "@/lib/coverImportRow";

type PreviewRow = {
  rowNumber: number;
  data: CoverRow;
  missingImage: boolean;
  duplicate: boolean;
  invalidDate: boolean;
  dateError?: string;
};

type ConfirmRowResult = {
  rowNumber: number;
  status: "created" | "failed";
  coverId?: string;
  error?: string;
  postalCircleUnmapped?: boolean;
};

export default function BulkImportPage() {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmResults, setConfirmResults] = useState<ConfirmRowResult[] | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        router.push("/login");
        return;
      }
      setSessionChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handlePreview = () => {
    setParseError(null);
    setPreview(null);
    setConfirmResults(null);
    setConfirmError(null);

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

        const rows: PreviewRow[] = results.data.map((data, i) => {
          const dateResult = parseDateOfIssue(data["Date of Issue"] ?? "");
          return {
            rowNumber: i + 1,
            data,
            missingImage: !imageFileNames.has((data["Image File Name"] ?? "").trim()),
            duplicate: isDuplicateCover(
              data["Name of the GI Tag / Item"],
              data["Date of Issue"],
              existing
            ),
            invalidDate: !dateResult.ok,
            dateError: dateResult.ok ? undefined : dateResult.error,
          };
        });
        setPreview(rows);
        setIsChecking(false);
      },
      error: (err) => {
        setParseError(err.message);
        setIsChecking(false);
      },
    });
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirmError(null);
    setConfirmResults(null);
    setIsConfirming(true);

    const qualifyingRows = preview.filter(
      (r) => !r.missingImage && !r.duplicate && !r.invalidDate
    );

    const formData = new FormData();
    formData.append(
      "rows",
      JSON.stringify(qualifyingRows.map((r) => ({ rowNumber: r.rowNumber, data: r.data })))
    );
    for (const file of imageFiles) {
      formData.append("images", file);
    }

    try {
      const res = await authorizedFetch("/api/confirm-import", { method: "POST", body: formData });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? `Confirm import failed (${res.status})`);
      }
      setConfirmResults(body.results ?? []);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsConfirming(false);
    }
  };

  const missingImageCount = preview?.filter((r) => r.missingImage).length ?? 0;
  const duplicateCount = preview?.filter((r) => r.duplicate).length ?? 0;
  const invalidDateCount = preview?.filter((r) => r.invalidDate).length ?? 0;
  const qualifyingCount =
    preview?.filter((r) => !r.missingImage && !r.duplicate && !r.invalidDate).length ?? 0;

  const createdCount = confirmResults?.filter((r) => r.status === "created").length ?? 0;
  const failedCount = confirmResults?.filter((r) => r.status === "failed").length ?? 0;

  if (!sessionChecked) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bulk Import Covers</h1>
        <p className="text-sm text-gray-500">
          Upload a CSV and the referenced image files. This preview checks
          for missing image files, likely duplicates (GI Item + Date of
          Issue matching an existing cover of any status), and unparseable
          dates — confirming creates <code>draft</code> entries only for
          rows that pass all three.
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
            {missingImageCount === 0 && duplicateCount === 0 && invalidDateCount === 0
              ? "no issues found."
              : [
                  missingImageCount > 0
                    ? `${missingImageCount} row${missingImageCount === 1 ? "" : "s"} missing an image file`
                    : null,
                  duplicateCount > 0
                    ? `${duplicateCount} likely duplicate${duplicateCount === 1 ? "" : "s"}`
                    : null,
                  invalidDateCount > 0
                    ? `${invalidDateCount} row${invalidDateCount === 1 ? "" : "s"} with an unreadable Date of Issue`
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
                {preview.map((row) => {
                  const hasIssue = row.missingImage || row.duplicate || row.invalidDate;
                  return (
                    <tr key={row.rowNumber} className={hasIssue ? "bg-red-50" : undefined}>
                      <td className="px-3 py-2">{row.rowNumber}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {hasIssue ? (
                          <div className="space-y-0.5">
                            {row.missingImage && (
                              <div className="text-red-600 font-medium">
                                Missing image: {row.data["Image File Name"] || "(blank)"}
                              </div>
                            )}
                            {row.duplicate && (
                              <div className="text-amber-700 font-medium">Likely duplicate</div>
                            )}
                            {row.invalidDate && (
                              <div className="text-red-600 font-medium">{row.dateError}</div>
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
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isConfirming || qualifyingCount === 0}
              className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
            >
              {isConfirming
                ? "Confirming…"
                : `Confirm Import (${qualifyingCount} row${qualifyingCount === 1 ? "" : "s"})`}
            </button>
            {qualifyingCount === 0 && (
              <p className="mt-1 text-sm text-gray-500">
                No rows are clear of every issue above — nothing to confirm.
              </p>
            )}
            {confirmError && <p className="mt-2 text-red-600 text-sm">{confirmError}</p>}
          </div>
        </div>
      )}

      {confirmResults && (
        <div className="space-y-2">
          <p className="text-sm">
            {createdCount} row{createdCount === 1 ? "" : "s"} created,{" "}
            {failedCount} failed.
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Result</th>
                </tr>
              </thead>
              <tbody>
                {confirmResults.map((r) => (
                  <tr key={r.rowNumber} className={r.status === "failed" ? "bg-red-50" : undefined}>
                    <td className="px-3 py-2">{r.rowNumber}</td>
                    <td className="px-3 py-2">
                      {r.status === "created" ? (
                        <span className="text-green-700">
                          Created{r.postalCircleUnmapped ? " — postal circle not recognized, needs manual assignment" : ""}
                        </span>
                      ) : (
                        <span className="text-red-600">{r.error}</span>
                      )}
                    </td>
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
