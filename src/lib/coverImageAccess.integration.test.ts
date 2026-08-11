import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { createTestUser, deleteTestUser, type TestUser } from "@/lib/testHelpers/createTestUser";

// Integration tier (see docs/Test-Strategy.md). Proves the T-07 storage.objects
// policies (20260808153406_cover_images_review_read_policies.sql) actually
// gate image access the way covers' own RLS gates row access: Admin reads
// any status' image, Verifier reads draft/flagged only — checked live
// against the real Storage API, not asserted from the SQL alone.
//
// Extended for T-08 (20260811190000_cover_images_verified_read_policy.sql):
// Collector can now download a *verified* cover's image (still nothing for
// draft/flagged), and — since that new policy is scoped to `authenticated`
// only, not `anon`, per the corrected design in API-Integration-Contracts.md
// §4 — a fully anonymous caller still can't, checked directly rather than
// assumed from the policy text.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(supabaseUrl && anonKey && serviceRoleKey);
const BUCKET = "cover-images";

if (!hasCredentials) {
  console.warn(
    "[coverImageAccess.integration.test] Skipped — NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are not all set in .env.local."
  );
}

describe.skipIf(!hasCredentials)("cover-images Storage read policies (T-07)", () => {
  const runId = `t07-img-${Date.now()}`;
  const coverIds: string[] = [];
  const storagePaths: string[] = [];
  let admin: SupabaseClient;
  let users: Record<"admin" | "verifier" | "collector", TestUser>;

  async function seedCoverWithImage(status: "draft" | "flagged" | "verified", suffix: string) {
    const storagePath = `${randomUUID()}/${suffix}.jpg`;
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, new Blob(["test-bytes"]), { contentType: "image/jpeg" });
    if (uploadError) throw new Error(`Failed to seed image: ${uploadError.message}`);
    storagePaths.push(storagePath);

    const { data, error } = await admin
      .from("covers")
      .insert({
        name_of_cover: `${runId} ${suffix}`,
        image_file: storagePath,
        verification_status: status,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Failed to seed cover: ${error?.message}`);
    coverIds.push(data.id);
    return storagePath;
  }

  beforeAll(async () => {
    admin = createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false } });
    users = {
      admin: await createTestUser(admin, supabaseUrl!, anonKey!, runId, "admin"),
      verifier: await createTestUser(admin, supabaseUrl!, anonKey!, runId, "verifier"),
      collector: await createTestUser(admin, supabaseUrl!, anonKey!, runId, "collector"),
    };
  }, 30_000);

  afterAll(async () => {
    await admin.storage.from(BUCKET).remove(storagePaths);
    await admin.from("covers").delete().in("id", coverIds);
    for (const { userId } of Object.values(users)) {
      await deleteTestUser(admin, userId);
    }
  }, 30_000);

  it("Verifier can download a draft cover's image", async () => {
    const path = await seedCoverWithImage("draft", "draft-img");
    const { data, error } = await users.verifier.client.storage.from(BUCKET).download(path);
    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it("Verifier can download a flagged cover's image", async () => {
    const path = await seedCoverWithImage("flagged", "flagged-img");
    const { data, error } = await users.verifier.client.storage.from(BUCKET).download(path);
    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it("Verifier cannot download a verified cover's image", async () => {
    const path = await seedCoverWithImage("verified", "verified-img");
    const { data, error } = await users.verifier.client.storage.from(BUCKET).download(path);
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("Admin can download a verified cover's image", async () => {
    const path = await seedCoverWithImage("verified", "admin-verified-img");
    const { data, error } = await users.admin.client.storage.from(BUCKET).download(path);
    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it("Collector cannot download a draft cover's image", async () => {
    const path = await seedCoverWithImage("draft", "collector-draft-img");
    const { data, error } = await users.collector.client.storage.from(BUCKET).download(path);
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("Collector cannot download a flagged cover's image", async () => {
    // Direct pairing with "Verifier can download a flagged cover's image"
    // above — the draft case alone doesn't prove this; the Verifier policy
    // is scoped to draft/flagged together, so Collector access needs
    // checking against both, not inferred from one.
    const path = await seedCoverWithImage("flagged", "collector-flagged-img");
    const { data, error } = await users.collector.client.storage.from(BUCKET).download(path);
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("Collector can download a verified cover's image (T-08)", async () => {
    // As of 20260811190000_cover_images_verified_read_policy.sql, this is
    // no longer a rejection case — it flipped from "cannot" to "can" when
    // that migration landed. Left red here instead of updated would
    // directly contradict the new policy's own intent.
    const path = await seedCoverWithImage("verified", "collector-verified-img");
    const { data, error } = await users.collector.client.storage.from(BUCKET).download(path);
    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it("anon (no session at all) still cannot download a verified cover's image (T-08)", async () => {
    // Confirms the new policy is authenticated-scoped, not accidentally
    // public — this app has a locked non-goal of no anonymous browsing
    // anywhere, and this is the direct check for that boundary on the new
    // policy specifically, not an inference from covers' own anon rejection.
    const anonClient = createClient(supabaseUrl!, anonKey!, { auth: { persistSession: false } });
    const path = await seedCoverWithImage("verified", "anon-verified-img");
    const { data, error } = await anonClient.storage.from(BUCKET).download(path);
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
