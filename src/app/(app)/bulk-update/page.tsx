"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { supabaseBrowser } from "@/lib/supabaseBrowserClient";
import { fetchCurrentRole } from "@/lib/currentRole";
import { sanitizeCsvCell } from "@/lib/sanitizeCsvCell";
import { extractGiRegistrationNumber } from "@/lib/extractGiRegistrationNumber";
import { normalizeFileName } from "@/lib/normalizeFileName";
import { uploadCoverImage, deleteCoverImage, runWithConcurrency } from "@/lib/uploadCoverImage";
import {
  computeBulkUpdatePlan,
  type BulkUpdatePlanRow,
  type ExistingCoverForUpdate,
} from "@/lib/computeBulkUpdatePlan";
import type { CoverRow } from "@/lib/coverImportRow";

const UPLOAD_CONCURRENCY = 5;

type ConfirmRowResult = { rowNumber: number; status: "updated" | "failed"; error?: string };

const STATUS_LABEL: Record<BulkUpdatePlanRow["status"], string> = {
  ok: "OK",
  "not-found": "Not found — no existing cover matches",
  ambiguous: "Ambiguous — multiple covers share this GI Item + Date, skipped",
  "invalid-date": "Unreadable Date of Issue",
  "missing-new-image": "New image specified but not selected",
};

export default function BulkUpdatePage() {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<BulkUpdatePlanRow[] | null>(null);
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
      // Admin-only, same as /import — bulk-update writes directly to
      // covers via the caller's own session (not a service-role route),
      // relying on the exact same "Admin full access to covers" RLS
      // policy /import's own confirm-import relies on server-side.
      const role = await fetchCurrentRole(supabaseBrowser);
      if (cancelled) return;
      if (role !== "admin") {
        router.push("/review");
        return;
      }
      setSessionChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handlePreview = async () => {
    setParseError(null);
    setPreview(null);
    setConfirmResults(null);
    setConfirmError(null);

    if (!csvFile) {
      setParseError("Choose a correction CSV file first.");
      return;
    }
    setIsChecking(true);

    const imageFileNames = new Set(imageFiles.map((f) => normalizeFileName(f.name)));

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

        const rows = results.data.map((data, i) => ({ rowNumber: i + 1, data }));

        const candidateGiItemNames = Array.from(
          new Set(
            rows
              .map((r) => extractGiRegistrationNumber(r.data["Name of the GI Tag / Item"] ?? "").cleanedName)
              .filter(Boolean)
          )
        );

        try {
          const [existingResult, circlesResult] = await Promise.all([
            candidateGiItemNames.length > 0
              ? supabaseBrowser
                  .from("covers")
                  .select(
                    "id, gi_item_name, date_of_issue, name_of_cover, product_category, cancellation_description, cachet_description, overall_description, place_of_issue, postal_circle_id, image_file"
                  )
                  .in("gi_item_name", candidateGiItemNames)
              : Promise.resolve({ data: [] as ExistingCoverForUpdate[], error: null }),
            supabaseBrowser.from("postal_circles").select("id, name"),
          ]);
          if (existingResult.error) throw existingResult.error;
          if (circlesResult.error) throw circlesResult.error;

          const circleIdByName = new Map<string, string>(
            (circlesResult.data ?? []).map((c) => [c.name, c.id])
          );

          const plan = computeBulkUpdatePlan(
            rows,
            (existingResult.data ?? []) as ExistingCoverForUpdate[],
            circleIdByName,
            imageFileNames
          );
          setPreview(plan);
        } catch (err) {
          setParseError(
            `Could not check for matching covers: ${err instanceof Error ? err.message : String(err)}`
          );
        } finally {
          setIsChecking(false);
        }
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

    const okRows = preview.filter((r) => r.status === "ok");
    const imageByName = new Map(imageFiles.map((f) => [normalizeFileName(f.name), f]));

    const results = await runWithConcurrency(okRows, UPLOAD_CONCURRENCY, async (planRow) => {
      const updates = { ...(planRow.updates ?? {}) };
      let newStoragePath: string | null = null;

      if (planRow.imageChange?.type === "replace") {
        const file = imageByName.get(normalizeFileName(planRow.imageChange.fileName));
        if (!file) {
          return { rowNumber: planRow.rowNumber, status: "failed" as const, error: "Selected image file went missing before upload" };
        }
        const uploadResult = await uploadCoverImage(file);
        if (!uploadResult.ok) {
          return { rowNumber: planRow.rowNumber, status: "failed" as const, error: `Image upload failed: ${uploadResult.error}` };
        }
        newStoragePath = uploadResult.storagePath;
        updates.image_file = newStoragePath;
      }

      const { data: beforeUpdate } = await supabaseBrowser
        .from("covers")
        .select("image_file")
        .eq("id", planRow.coverId)
        .single();
      const previousImagePath = beforeUpdate?.image_file ?? null;

      const { error: updateError } = await supabaseBrowser
        .from("covers")
        .update(updates)
        .eq("id", planRow.coverId);

      if (updateError) {
        if (newStoragePath) {
          await deleteCoverImage(newStoragePath);
        }
        return { rowNumber: planRow.rowNumber, status: "failed" as const, error: updateError.message };
      }

      if (newStoragePath && previousImagePath && previousImagePath !== newStoragePath) {
        await deleteCoverImage(previousImagePath);
      }

      return { rowNumber: planRow.rowNumber, status: "updated" as const };
    });

    setConfirmResults(results.sort((a, b) => a.rowNumber - b.rowNumber));
    setIsConfirming(false);
  };

  const notFoundCount = preview?.filter((r) => r.status === "not-found").length ?? 0;
  const ambiguousCount = preview?.filter((r) => r.status === "ambiguous").length ?? 0;
  const invalidDateCount = preview?.filter((r) => r.status === "invalid-date").length ?? 0;
  const missingImageCount = preview?.filter((r) => r.status === "missing-new-image").length ?? 0;
  const okCount = preview?.filter((r) => r.status === "ok").length ?? 0;

  const updatedCount = confirmResults?.filter((r) => r.status === "updated").length ?? 0;
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
        <h1 className="text-2xl font-semibold">Bulk Update Covers</h1>
        <p className="text-sm text-gray-500">
          Correct multiple existing catalogued covers at once. Matches each
          row to an existing cover by GI Item + Date of Issue (the same key
          duplicate detection uses) — those two fields can&apos;t themselves
          be corrected here, since changing either would change which cover
          is being matched; use a direct correction for that instead. Any
          other blank field is left unchanged; a non-blank value overwrites.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border p-6">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="csv-input">
            Correction CSV file
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
            Replacement images (optional)
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
          {isChecking ? "Checking…" : "Preview Update"}
        </button>

        {parseError && <p className="text-red-600 text-sm">{parseError}</p>}
      </div>

      {preview && (
        <div className="space-y-2">
          <p className="text-sm">
            {preview.length} row{preview.length === 1 ? "" : "s"} parsed —{" "}
            {okCount === preview.length
              ? "all matched, ready to update."
              : [
                  notFoundCount > 0 ? `${notFoundCount} not found` : null,
                  ambiguousCount > 0 ? `${ambiguousCount} ambiguous` : null,
                  invalidDateCount > 0 ? `${invalidDateCount} unreadable date` : null,
                  missingImageCount > 0 ? `${missingImageCount} missing new image` : null,
                ]
                  .filter(Boolean)
                  .join(", ") + "."}
          </p>

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">GI Item</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Changes</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.rowNumber} className={row.status !== "ok" ? "bg-red-50" : undefined}>
                    <td className="px-3 py-2">{row.rowNumber}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.giItemName}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.dateOfIssue}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.status === "ok" ? (
                        <span className="text-green-700">OK</span>
                      ) : (
                        <span className="text-red-600 font-medium">
                          {STATUS_LABEL[row.status]}
                          {row.error ? `: ${row.error}` : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.status === "ok" && (
                        <div className="space-y-0.5">
                          {(row.diffs ?? []).map((d) => (
                            <div key={d.field}>
                              <span className="font-medium">{d.field}:</span>{" "}
                              {d.oldValue ?? "(blank)"} → {d.newValue}
                            </div>
                          ))}
                          {row.imageChange?.type === "replace" && (
                            <div>
                              <span className="font-medium">Image:</span> replace with{" "}
                              {row.imageChange.fileName}
                            </div>
                          )}
                          {row.postalCircleUnmapped && (
                            <div className="text-amber-700">
                              Postal circle not recognized — will be set to unmapped.
                            </div>
                          )}
                          {(row.diffs ?? []).length === 0 && row.imageChange?.type !== "replace" && (
                            <span className="text-gray-400">No changes</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isConfirming || okCount === 0}
              className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
            >
              {isConfirming ? "Updating…" : `Confirm Update (${okCount} row${okCount === 1 ? "" : "s"})`}
            </button>
            {okCount === 0 && (
              <p className="mt-1 text-sm text-gray-500">
                No rows matched cleanly — nothing to update.
              </p>
            )}
            {confirmError && <p className="mt-2 text-red-600 text-sm">{confirmError}</p>}
          </div>
        </div>
      )}

      {confirmResults && (
        <div className="space-y-2">
          <p className="text-sm">
            {updatedCount} row{updatedCount === 1 ? "" : "s"} updated, {failedCount} failed.
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
                      {r.status === "updated" ? (
                        <span className="text-green-700">Updated</span>
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
