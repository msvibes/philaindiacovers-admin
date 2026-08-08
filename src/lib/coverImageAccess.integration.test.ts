import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { createTestUser, deleteTestUser, type TestUser } from "@/lib/testHelpers/createTestUser";

// Integration tier (see docs/Test-Strategy.md). Proves the T-07 storage.objects
// policies (20260808153406_cover_images_review_read_policies.sql) actually
// gate image access the way covers' own RLS gates row access: Admin reads
// any status' image, Verifier reads draft/flagged only, Collector reads
// neither — checked live against the real Storage API, not asserted from
// the SQL alone.

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
});
