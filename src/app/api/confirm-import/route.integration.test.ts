import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { POST } from "./route";
import { createTestUser, deleteTestUser, type TestUser } from "@/lib/testHelpers/createTestUser";

// Integration tier (see docs/Test-Strategy.md): talks to the real Supabase
// dev project via the same service-role client the route itself uses.
// Persisted regression protection for T-05's actual insert path, not just
// the manual live-browser verification also done for this task.
//
// Request shape updated (launch-scale bulk import work, 2026-09): the
// route no longer accepts FormData with image bytes — the client now
// uploads each image directly to Storage first (uploadCoverImage.ts) and
// submits JSON with the resulting storagePath. Tests upload a real test
// image via supabaseAdmin.storage first, mirroring that real precondition,
// rather than passing a synthetic path the object doesn't actually exist
// at.

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
  let users: Record<"admin" | "verifier" | "collector", TestUser>;

  beforeAll(async () => {
    ({ supabaseAdmin } = await import("@/lib/supabaseAdminClient"));
    const adminClient = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false },
    });
    users = {
      admin: await createTestUser(adminClient, supabaseUrl!, anonKey!, runId, "admin"),
      verifier: await createTestUser(adminClient, supabaseUrl!, anonKey!, runId, "verifier"),
      collector: await createTestUser(adminClient, supabaseUrl!, anonKey!, runId, "collector"),
    };
  }, 30_000);

  afterAll(async () => {
    for (const { userId } of Object.values(users)) {
      await deleteTestUser(supabaseAdmin, userId);
    }
  }, 30_000);

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

  // Mirrors what uploadCoverImage.ts does client-side, before this route
  // is ever called — a real object at a real path, not a synthetic string.
  async function uploadTestImage(fileName: string, content: string): Promise<string> {
    const storagePath = `${runId}/${fileName}`;
    const { error } = await supabaseAdmin.storage
      .from("cover-images")
      .upload(storagePath, new File([content], fileName, { type: "image/jpeg" }));
    if (error) throw new Error(`test setup: failed to upload ${fileName}: ${error.message}`);
    uploadedStoragePaths.push(storagePath);
    return storagePath;
  }

  // Defaults to a real Admin session's token (T-06.5's requireRole() gate).
  // Tests exercising the auth gate itself pass a different token explicitly.
  function buildRequest(
    rows: { rowNumber: number; data: Record<string, string>; storagePath: string }[],
    token: string | null = users?.admin?.accessToken ?? null
  ) {
    return new NextRequest("http://localhost/api/confirm-import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ rows }),
    });
  }

  async function trackResults(results: ConfirmRowResult[]) {
    for (const r of results) {
      if (r.status === "created" && r.coverId) {
        createdCoverIds.push(r.coverId);
      }
    }
  }

  it("creates a draft cover, extracting the GI number and normalizing the postal circle", async () => {
    const storagePath = await uploadTestImage("test1.jpg", "test-bytes");
    const row = {
      rowNumber: 1,
      storagePath,
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

    const res = await POST(buildRequest([row]));
    const body = await res.json();
    await trackResults(body.results);

    expect(body.results).toHaveLength(1);
    expect(body.results[0].status).toBe("created");

    const { data: cover } = await supabaseAdmin
      .from("covers")
      .select("gi_item_name, gi_registration_number, date_of_issue, verification_status, image_file, postal_circles(name)")
      .eq("id", body.results[0].coverId)
      .single();

    expect(cover?.gi_item_name).toBe(`${runId} Test Item`);
    expect(cover?.gi_registration_number).toBe("999");
    expect(cover?.date_of_issue).toBe("2021-09-05");
    expect(cover?.verification_status).toBe("draft");
    expect(cover?.image_file).toBe(storagePath);
    expect((cover as unknown as { postal_circles: { name: string } })?.postal_circles?.name).toBe(
      "Bihar"
    );
  });

  it("fails a row with a missing storagePath, without creating anything", async () => {
    const row = {
      rowNumber: 1,
      storagePath: "",
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

    const res = await POST(buildRequest([row]));
    const body = await res.json();
    await trackResults(body.results);

    expect(body.results[0].status).toBe("failed");
    expect(body.results[0].error).toMatch(/Missing storagePath/);
  });

  it("fails a row with an unparseable date, without creating anything", async () => {
    const storagePath = await uploadTestImage("test2.jpg", "test-bytes");
    const row = {
      rowNumber: 1,
      storagePath,
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

    const res = await POST(buildRequest([row]));
    const body = await res.json();
    await trackResults(body.results);

    expect(body.results[0].status).toBe("failed");
    expect(body.results[0].error).toMatch(/Unrecognized date format/);
  });

  it("creates the first of two within-batch duplicates and fails the second", async () => {
    const giItem = `${runId} Batch Duplicate Item`;
    const makeRow = async (n: number, fileName: string) => ({
      rowNumber: n,
      storagePath: await uploadTestImage(fileName, `bytes-${n}`),
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
    const rows = [await makeRow(1, "dup1.jpg"), await makeRow(2, "dup2.jpg")];

    const res = await POST(buildRequest(rows));
    const body = await res.json();
    await trackResults(body.results);

    expect(body.results[0].status).toBe("created");
    expect(body.results[1].status).toBe("failed");
    expect(body.results[1].error).toMatch(/Duplicate/);
  });

  it("creates a cover with a null postal_circle_id and flags it when the circle name is unrecognized", async () => {
    const storagePath = await uploadTestImage("test3.jpg", "c");
    const row = {
      rowNumber: 1,
      storagePath,
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

    const res = await POST(buildRequest([row]));
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

  it("T-06.5: rejects a request with no bearer token, creating nothing", async () => {
    const storagePath = await uploadTestImage("test4.jpg", "d");
    const row = {
      rowNumber: 1,
      storagePath,
      data: {
        "Image File Name": "test4.jpg",
        "Name of the Cover": "Test Cover",
        "Name of the GI Tag / Item": `${runId} No Token Item`,
        "Product Category": "",
        "Description of Cancellation": "x",
        "Description of Cachet": "x",
        "Overall Description": "x",
        "Issuing Postal Circle": "Kerala",
        "Place of Issue": "Kochi",
        "Date of Issue": "2021-06-15",
      },
    };

    const res = await POST(buildRequest([row], null));
    expect(res.status).toBe(401);

    const { data: cover } = await supabaseAdmin
      .from("covers")
      .select("id")
      .eq("gi_item_name", `${runId} No Token Item`)
      .maybeSingle();
    expect(cover).toBeNull();
  });

  it("T-06.5: rejects a Verifier session — Admin-only, even though they're authenticated", async () => {
    const storagePath = await uploadTestImage("test5.jpg", "e");
    const row = {
      rowNumber: 1,
      storagePath,
      data: {
        "Image File Name": "test5.jpg",
        "Name of the Cover": "Test Cover",
        "Name of the GI Tag / Item": `${runId} Verifier Forbidden Item`,
        "Product Category": "",
        "Description of Cancellation": "x",
        "Description of Cachet": "x",
        "Overall Description": "x",
        "Issuing Postal Circle": "Kerala",
        "Place of Issue": "Kochi",
        "Date of Issue": "2021-06-15",
      },
    };

    const res = await POST(buildRequest([row], users.verifier.accessToken));
    expect(res.status).toBe(403);

    const { data: cover } = await supabaseAdmin
      .from("covers")
      .select("id")
      .eq("gi_item_name", `${runId} Verifier Forbidden Item`)
      .maybeSingle();
    expect(cover).toBeNull();
  });
});
