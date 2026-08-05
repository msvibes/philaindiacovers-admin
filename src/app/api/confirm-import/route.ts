import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { sanitizeCsvCell } from "@/lib/sanitizeCsvCell";
import { extractGiRegistrationNumber } from "@/lib/extractGiRegistrationNumber";
import { parseDateOfIssue } from "@/lib/parseDateOfIssue";
import { normalizePostalCircleName } from "@/lib/normalizePostalCircle";
import { isDuplicateCover, type ExistingCoverKey } from "@/lib/isDuplicateCover";
import type { CoverRow } from "@/lib/coverImportRow";

// SECURITY GAP (tracked in PROGRESS.md, not yet fixed): like
// /api/check-duplicate-covers, this route has no access control — no auth
// exists anywhere in either app yet. Same owner: T-06.5.
//
// T-02's client-side checks (missing image, duplicate) are convenience
// only, not a security boundary — every check that matters is re-run here
// independently: sanitization, duplicate detection (including within this
// same batch, which a client-only check can't catch), and image presence.

const BUCKET = "cover-images";

type SubmittedRow = { rowNumber: number; data: CoverRow };

type RowResult = {
  rowNumber: number;
  status: "created" | "failed";
  coverId?: string;
  error?: string;
  postalCircleUnmapped?: boolean;
};

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const rowsRaw = formData.get("rows");
  if (typeof rowsRaw !== "string") {
    return NextResponse.json({ error: "Missing 'rows' field" }, { status: 400 });
  }

  let rows: SubmittedRow[];
  try {
    rows = JSON.parse(rowsRaw);
  } catch {
    return NextResponse.json({ error: "'rows' is not valid JSON" }, { status: 400 });
  }
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: "'rows' must be an array" }, { status: 400 });
  }

  const imageFiles = formData.getAll("images").filter((v): v is File => v instanceof File);
  const imageByName = new Map(imageFiles.map((f) => [f.name, f]));

  const { data: circles, error: circlesError } = await supabaseAdmin
    .from("postal_circles")
    .select("id, name");
  if (circlesError) {
    return NextResponse.json({ error: circlesError.message }, { status: 500 });
  }
  const circleIdByName = new Map<string, string>((circles ?? []).map((c) => [c.name, c.id]));

  // Pre-load existing covers for the duplicate re-check, keyed on the
  // SANITIZED + GI-number-stripped item names this batch will actually
  // use for comparison, not the raw incoming text.
  const candidateGiItemNames = Array.from(
    new Set(
      rows
        .map((r) => sanitizeCsvCell(r.data["Name of the GI Tag / Item"] ?? ""))
        .map((v) => extractGiRegistrationNumber(v).cleanedName)
        .filter(Boolean)
    )
  );

  const existing: ExistingCoverKey[] = [];
  if (candidateGiItemNames.length > 0) {
    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from("covers")
      .select("gi_item_name, date_of_issue")
      .in("gi_item_name", candidateGiItemNames);
    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }
    existing.push(...(existingRows ?? []));
  }

  const results: RowResult[] = [];

  for (const { rowNumber, data: raw } of rows) {
    try {
      const sanitized = Object.fromEntries(
        Object.entries(raw).map(([key, value]) => [key, sanitizeCsvCell(String(value ?? ""))])
      ) as CoverRow;

      const imageFileName = sanitized["Image File Name"];
      const imageFile = imageByName.get(imageFileName);
      if (!imageFile) {
        results.push({
          rowNumber,
          status: "failed",
          error: `Missing image file: ${imageFileName || "(blank)"}`,
        });
        continue;
      }

      const { cleanedName, giRegistrationNumber } = extractGiRegistrationNumber(
        sanitized["Name of the GI Tag / Item"]
      );

      const dateResult = parseDateOfIssue(sanitized["Date of Issue"]);
      if (!dateResult.ok) {
        results.push({ rowNumber, status: "failed", error: dateResult.error });
        continue;
      }

      if (isDuplicateCover(cleanedName, dateResult.isoDate, existing)) {
        results.push({
          rowNumber,
          status: "failed",
          error: "Duplicate: matches an existing cover's GI Item + Date of Issue",
        });
        continue;
      }

      const normalizedCircle = normalizePostalCircleName(sanitized["Issuing Postal Circle"]);
      const postalCircleId = circleIdByName.get(normalizedCircle) ?? null;

      // Upload first, then insert. If the insert fails after a successful
      // upload, best-effort delete the orphaned file — avoids ever ending
      // up with a covers row whose image_file points at nothing, which is
      // worse than a leftover unreferenced file.
      const storagePath = `${randomUUID()}/${imageFileName}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storagePath, imageFile, {
          contentType: imageFile.type || "application/octet-stream",
        });
      if (uploadError) {
        results.push({
          rowNumber,
          status: "failed",
          error: `Image upload failed: ${uploadError.message}`,
        });
        continue;
      }

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("covers")
        .insert({
          image_file: storagePath,
          name_of_cover: sanitized["Name of the Cover"],
          gi_item_name: cleanedName,
          gi_registration_number: giRegistrationNumber,
          product_category: sanitized["Product Category"] || null,
          cancellation_description: sanitized["Description of Cancellation"],
          cachet_description: sanitized["Description of Cachet"],
          overall_description: sanitized["Overall Description"],
          postal_circle_id: postalCircleId,
          place_of_issue: sanitized["Place of Issue"],
          date_of_issue: dateResult.isoDate,
          verification_status: "draft",
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        const { error: cleanupError } = await supabaseAdmin.storage
          .from(BUCKET)
          .remove([storagePath]);
        const baseError = insertError?.message ?? "Insert failed";
        results.push({
          rowNumber,
          status: "failed",
          error: cleanupError
            ? `${baseError} (cleanup of uploaded image also failed: ${cleanupError.message})`
            : baseError,
        });
        continue;
      }

      // So a later row in this same batch with the same GI Item + Date is
      // also caught, not just pre-existing rows from before this import.
      existing.push({ gi_item_name: cleanedName, date_of_issue: dateResult.isoDate });

      results.push({
        rowNumber,
        status: "created",
        coverId: inserted.id,
        postalCircleUnmapped: postalCircleId === null && Boolean(sanitized["Issuing Postal Circle"]),
      });
    } catch (err) {
      results.push({
        rowNumber,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ results });
}
