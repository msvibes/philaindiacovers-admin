import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { requireRole } from "@/lib/requireRole";
import { sanitizeCsvCell } from "@/lib/sanitizeCsvCell";
import { extractGiRegistrationNumber } from "@/lib/extractGiRegistrationNumber";
import { parseDateOfIssue } from "@/lib/parseDateOfIssue";
import { normalizePostalCircleName } from "@/lib/normalizePostalCircle";
import { isDuplicateCover, type ExistingCoverKey } from "@/lib/isDuplicateCover";
import type { CoverRow } from "@/lib/coverImportRow";

// Access-control gap open since T-05 (the more serious of the two — this
// route writes covers rows, not just reads), closed by T-06.5: every
// request now needs a verified Admin session (see requireRole.ts) — a
// real server-side check, not a client-supplied claim.
//
// T-02's client-side checks (missing image, duplicate) are convenience
// only, not a security boundary — every check that matters is re-run here
// independently: sanitization, duplicate detection (including within this
// same batch, which a client-only check can't catch).
//
// Image bytes no longer travel through this route at all (launch-scale
// bulk import work, 2026-09): Vercel Functions cap request bodies at
// 4.5MB on every plan, confirmed against Vercel's own current docs, so a
// single multipart request carrying every image in a ~500-row batch
// doesn't scale. The client now uploads each image directly to Storage
// via uploadCoverImage.ts (requires the Admin-only storage.objects INSERT
// policy, 20260916133752_cover_images_admin_write_policy.sql) and submits
// only the resulting storagePath here — this route's own job shrinks to
// exactly what only the server can safely do: the duplicate re-check and
// the covers insert.

const BUCKET = "cover-images";

type SubmittedRow = { rowNumber: number; data: CoverRow; storagePath: string };

type RowResult = {
  rowNumber: number;
  status: "created" | "failed";
  coverId?: string;
  error?: string;
  postalCircleUnmapped?: boolean;
};

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, "admin");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const rows: unknown = body?.rows;
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: "'rows' must be an array" }, { status: 400 });
  }

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
      (rows as SubmittedRow[])
        .map((r) => sanitizeCsvCell(r.data?.["Name of the GI Tag / Item"] ?? ""))
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

  for (const { rowNumber, data: raw, storagePath } of rows as SubmittedRow[]) {
    try {
      if (typeof storagePath !== "string" || storagePath.length === 0) {
        results.push({ rowNumber, status: "failed", error: "Missing storagePath — image was not uploaded" });
        continue;
      }

      const sanitized = Object.fromEntries(
        Object.entries(raw).map(([key, value]) => [key, sanitizeCsvCell(String(value ?? ""))])
      ) as CoverRow;

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
        // Insert failed after the client already uploaded the image —
        // clean up the now-orphaned Storage object rather than leaving a
        // covers-less file behind. Same discipline this route always had,
        // just on the delete side only now that upload itself happens
        // client-side.
        const { error: cleanupError } = await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
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
