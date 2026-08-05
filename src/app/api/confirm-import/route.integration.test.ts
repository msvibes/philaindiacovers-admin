import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

// Integration tier (see docs/Test-Strategy.md): talks to the real Supabase
// dev project via the same service-role client the route itself uses.
// Persisted regression protection for T-05's actual insert path, not just
// the manual live-browser verification also done for this task.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(supabaseUrl && anonKey && serviceRoleKey);

if (!hasCredentials) {
  console.warn(
    "[confirm-import route.integration.test] Skipped — NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are not all set in .env.local."
  );
}

type ConfirmRowResult = {
  rowNumber: number;
  status: "created" | "failed";
  coverId?: string;
  error?: string;
  postalCircleUnmapped?: boolean;
};

describe.skipIf(!hasCredentials)("POST /api/confirm-import (T-05)", () => {
  const runId = `t05-${Date.now()}`;
  const createdCoverIds: string[] = [];
  const uploadedStoragePaths: string[] = [];

  // Lazily imported so the module (and its env-var guard) only loads once
  // credentials are confirmed present.
  let supabaseAdmin: typeof import("@/lib/supabaseAdminClient").supabaseAdmin;

  beforeAll(async () => {
    ({ supabaseAdmin } = await import("@/lib/supabaseAdminClient"));
  });

  afterEach(async () => {
    if (createdCoverIds.length > 0) {
      await supabaseAdmin.from("covers").delete().in("id", createdCoverIds);
      createdCoverIds.length = 0;
    }
    if (uploadedStoragePaths.length > 0) {
      await supabaseAdmin.storage.from("cover-images").remove(uploadedStoragePaths);
      uploadedStoragePaths.length = 0;
    }
  });

  function buildRequest(rows: { rowNumber: number; data: Record<string, string> }[], files: File[]) {
    const formData = new FormData();
    formData.append("rows", JSON.stringify(rows));
    for (const file of files) formData.append("images", file);
    return new NextRequest("http://localhost/api/confirm-import", {
      method: "POST",
      body: formData,
    });
  }

  async function trackResults(results: ConfirmRowResult[]) {
    for (const r of results) {
      if (r.status === "created" && r.coverId) {
        createdCoverIds.push(r.coverId);
        const { data } = await supabaseAdmin
          .from("covers")
          .select("image_file")
          .eq("id", r.coverId)
          .single();
        if (data?.image_file) uploadedStoragePaths.push(data.image_file);
      }
    }
  }

  it("creates a draft cover, extracting the GI number and normalizing the postal circle", async () => {
    const row = {
      rowNumber: 1,
      data: {
        "Image File Name": "test1.jpg",
        "Name of the Cover": "Test Cover",
        "Name of the GI Tag / Item": `${runId} Test Item (GI No. 999)`,
        "Product Category": "",
        "Description of Cancellation": "x",
        "Description of Cachet": "x",
        "Overall Description": "x",
        "Issuing Postal Circle": "Bihar Circle",
        "Place of Issue": "Patna",
        "Date of Issue": "05.09.2021",
      },
    };
    const file = new File(["test-bytes"], "test1.jpg", { type: "image/jpeg" });

    const res = await POST(buildRequest([row], [file]));
    const body = await res.json();
    await trackResults(body.results);

    expect(body.results).toHaveLength(1);
    expect(body.results[0].status).toBe("created");

    const { data: cover } = await supabaseAdmin
      .from("covers")
      .select("gi_item_name, gi_registration_number, date_of_issue, verification_status, postal_circles(name)")
      .eq("id", body.results[0].coverId)
      .single();

    expect(cover?.gi_item_name).toBe(`${runId} Test Item`);
    expect(cover?.gi_registration_number).toBe("999");
    expect(cover?.date_of_issue).toBe("2021-09-05");
    expect(cover?.verification_status).toBe("draft");
    expect((cover as unknown as { postal_circles: { name: string } })?.postal_circles?.name).toBe(
      "Bihar"
    );
  });

  it("fails a row whose referenced image wasn't uploaded, without creating anything", async () => {
    const row = {
      rowNumber: 1,
      data: {
        "Image File Name": "does-not-exist.jpg",
        "Name of the Cover": "Test Cover",
        "Name of the GI Tag / Item": `${runId} Missing Image Item`,
        "Product Category": "",
        "Description of Cancellation": "x",
        "Description of Cachet": "x",
        "Overall Description": "x",
        "Issuing Postal Circle": "Kerala",
        "Place of Issue": "Kochi",
        "Date of Issue": "2021-01-01",
      },
    };

    const res = await POST(buildRequest([row], []));
    const body = await res.json();
    await trackResults(body.results);

    expect(body.results[0].status).toBe("failed");
    expect(body.results[0].error).toMatch(/Missing image file/);
  });

  it("fails a row with an unparseable date, without creating anything", async () => {
    const row = {
      rowNumber: 1,
      data: {
        "Image File Name": "test2.jpg",
        "Name of the Cover": "Test Cover",
        "Name of the GI Tag / Item": `${runId} Bad Date Item`,
        "Product Category": "",
        "Description of Cancellation": "x",
        "Description of Cachet": "x",
        "Overall Description": "x",
        "Issuing Postal Circle": "Kerala",
        "Place of Issue": "Kochi",
        "Date of Issue": "not-a-date",
      },
    };
    const file = new File(["test-bytes"], "test2.jpg", { type: "image/jpeg" });

    const res = await POST(buildRequest([row], [file]));
    const body = await res.json();
    await trackResults(body.results);

    expect(body.results[0].status).toBe("failed");
    expect(body.results[0].error).toMatch(/Unrecognized date format/);
  });

  it("creates the first of two within-batch duplicates and fails the second", async () => {
    const giItem = `${runId} Batch Duplicate Item`;
    const makeRow = (n: number, fileName: string) => ({
      rowNumber: n,
      data: {
        "Image File Name": fileName,
        "Name of the Cover": "Test Cover",
        "Name of the GI Tag / Item": giItem,
        "Product Category": "",
        "Description of Cancellation": "x",
        "Description of Cachet": "x",
        "Overall Description": "x",
        "Issuing Postal Circle": "Kerala",
        "Place of Issue": "Kochi",
        "Date of Issue": "2021-06-15",
      },
    });
    const rows = [makeRow(1, "dup1.jpg"), makeRow(2, "dup2.jpg")];
    const files = [
      new File(["a"], "dup1.jpg", { type: "image/jpeg" }),
      new File(["b"], "dup2.jpg", { type: "image/jpeg" }),
    ];

    const res = await POST(buildRequest(rows, files));
    const body = await res.json();
    await trackResults(body.results);

    expect(body.results[0].status).toBe("created");
    expect(body.results[1].status).toBe("failed");
    expect(body.results[1].error).toMatch(/Duplicate/);
  });

  it("creates a cover with a null postal_circle_id and flags it when the circle name is unrecognized", async () => {
    const row = {
      rowNumber: 1,
      data: {
        "Image File Name": "test3.jpg",
        "Name of the Cover": "Test Cover",
        "Name of the GI Tag / Item": `${runId} Unmapped Circle Item`,
        "Product Category": "",
        "Description of Cancellation": "x",
        "Description of Cachet": "x",
        "Overall Description": "x",
        "Issuing Postal Circle": "Not A Real Circle",
        "Place of Issue": "Nowhere",
        "Date of Issue": "2021-06-15",
      },
    };
    const file = new File(["c"], "test3.jpg", { type: "image/jpeg" });

    const res = await POST(buildRequest([row], [file]));
    const body = await res.json();
    await trackResults(body.results);

    expect(body.results[0].status).toBe("created");
    expect(body.results[0].postalCircleUnmapped).toBe(true);

    const { data: cover } = await supabaseAdmin
      .from("covers")
      .select("postal_circle_id")
      .eq("id", body.results[0].coverId)
      .single();
    expect(cover?.postal_circle_id).toBeNull();
  });
});
