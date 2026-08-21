import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { POST } from "./route";
import { createTestUser, deleteTestUser, type TestUser } from "@/lib/testHelpers/createTestUser";

// Integration tier (see docs/Test-Strategy.md). This route had no automated
// test at all before T-06.5 (T-03's own gap, per PROGRESS.md) — only a
// manual live verification. Covers both the pre-existing duplicate-lookup
// behavior and the T-06.5 auth gate together, since the gate is now what
// makes the route worth testing for real.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(supabaseUrl && anonKey && serviceRoleKey);

if (!hasCredentials) {
  console.warn(
    "[check-duplicate-covers route.integration.test] Skipped — NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are not all set in .env.local."
  );
}

describe.skipIf(!hasCredentials)("POST /api/check-duplicate-covers (T-03, T-06.5)", () => {
  const runId = `t065-dup-${Date.now()}`;
  const coverIds: string[] = [];

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

    const { data, error } = await adminClient
      .from("covers")
      .insert({
        name_of_cover: `${runId} existing`,
        gi_item_name: `${runId} Existing Item`,
        date_of_issue: "2021-06-15",
        verification_status: "draft",
        image_file: `${runId}/existing.jpg`,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Failed to seed a cover: ${error?.message}`);
    coverIds.push(data.id);

    // Seeded exactly the way confirm-import/route.ts actually stores it:
    // gi_item_name is the CLEANED name, with the "(GI No. ...)" annotation
    // already stripped by extractGiRegistrationNumber before insert - the
    // real, live shape of every already-imported cover that originally had
    // a GI number embedded in its CSV name.
    const { data: giData, error: giError } = await adminClient
      .from("covers")
      .insert({
        name_of_cover: `${runId} gi-annotated`,
        gi_item_name: `${runId} Annotated Item`,
        gi_registration_number: "999",
        date_of_issue: "2021-07-20",
        verification_status: "draft",
        image_file: `${runId}/gi-annotated.jpg`,
      })
      .select("id")
      .single();
    if (giError || !giData) throw new Error(`Failed to seed a GI-annotated cover: ${giError?.message}`);
    coverIds.push(giData.id);
  }, 30_000);

  afterAll(async () => {
    await supabaseAdmin.from("covers").delete().in("id", coverIds);
    for (const { userId } of Object.values(users)) {
      await deleteTestUser(supabaseAdmin, userId);
    }
  }, 30_000);

  function buildRequest(giItemNames: string[], token: string | null) {
    return new NextRequest("http://localhost/api/check-duplicate-covers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ giItemNames }),
    });
  }

  it("an Admin session finds the existing match", async () => {
    const res = await POST(buildRequest([`${runId} Existing Item`], users.admin.accessToken));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.existing).toHaveLength(1);
    expect(body.existing[0].gi_item_name).toBe(`${runId} Existing Item`);
  });

  it("finds a GI-annotated existing cover when queried with the raw, un-stripped CSV text a real client actually sends", async () => {
    // The real bug, reproduced directly: the client sends the raw
    // "Name of the GI Tag / Item" text, annotation and all - this route
    // must clean it the same way confirm-import cleaned it before
    // insert, or the .in() query silently returns nothing for every
    // already-imported cover that originally had a GI number embedded in
    // its name.
    const res = await POST(
      buildRequest([`${runId} Annotated Item (GI No. 999)`], users.admin.accessToken)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.existing).toHaveLength(1);
    expect(body.existing[0].gi_item_name).toBe(`${runId} Annotated Item`);
  });

  it("T-06.5: rejects a request with no bearer token", async () => {
    const res = await POST(buildRequest([`${runId} Existing Item`], null));
    expect(res.status).toBe(401);
  });

  it("T-06.5: rejects a request with an invalid bearer token", async () => {
    const res = await POST(buildRequest([`${runId} Existing Item`], "not-a-real-token"));
    expect(res.status).toBe(401);
  });

  it("T-06.5: rejects a Verifier session — Admin-only, even though they're authenticated", async () => {
    const res = await POST(buildRequest([`${runId} Existing Item`], users.verifier.accessToken));
    expect(res.status).toBe(403);
  });

  it("T-06.5: rejects a Collector session", async () => {
    const res = await POST(buildRequest([`${runId} Existing Item`], users.collector.accessToken));
    expect(res.status).toBe(403);
  });
});
