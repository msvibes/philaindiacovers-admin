import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, type TestUser } from "@/lib/testHelpers/createTestUser";
import { fetchReviewQueue } from "@/lib/reviewQueue";

// Integration tier (see docs/Test-Strategy.md). No new Route Handler for
// T-07 — this proves the Verifier's own authenticated client, relying on
// T-04's RLS directly, sees exactly draft/flagged covers and nothing else.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(supabaseUrl && anonKey && serviceRoleKey);

if (!hasCredentials) {
  console.warn(
    "[reviewQueue.integration.test] Skipped — NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are not all set in .env.local."
  );
}

describe.skipIf(!hasCredentials)("fetchReviewQueue (T-07)", () => {
  const runId = `t07-queue-${Date.now()}`;
  const coverIds: string[] = [];
  let admin: SupabaseClient;
  let users: Record<"admin" | "verifier" | "collector", TestUser>;

  async function seedCover(status: "draft" | "flagged" | "verified", suffix: string) {
    const { data, error } = await admin
      .from("covers")
      .insert({
        name_of_cover: `${runId} ${suffix}`,
        gi_item_name: `${runId} ${suffix}`,
        verification_status: status,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Failed to seed a ${status} cover: ${error?.message}`);
    coverIds.push(data.id);
    return data.id as string;
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
    await admin.from("covers").delete().in("id", coverIds);
    for (const { userId } of Object.values(users)) {
      await deleteTestUser(admin, userId);
    }
  }, 30_000);

  it("a Verifier sees exactly this run's draft and flagged covers, not verified", async () => {
    const draftId = await seedCover("draft", "draft-item");
    const flaggedId = await seedCover("flagged", "flagged-item");
    const verifiedId = await seedCover("verified", "verified-item");

    const queue = await fetchReviewQueue(users.verifier.client);
    const seenIds = queue.map((c) => c.id);

    expect(seenIds).toContain(draftId);
    expect(seenIds).toContain(flaggedId);
    expect(seenIds).not.toContain(verifiedId);
  });

  it("a Collector sees nothing in the queue — RLS has no draft/flagged grant for that role", async () => {
    await seedCover("draft", "collector-should-not-see");

    const queue = await fetchReviewQueue(users.collector.client);
    const thisRunIds = queue.filter((c) => c.gi_item_name?.startsWith(runId));

    expect(thisRunIds).toHaveLength(0);
  });

  it("returns the joined postal circle name when present", async () => {
    const { data: circle } = await admin.from("postal_circles").select("id").limit(1).single();
    const { data: cover } = await admin
      .from("covers")
      .insert({
        name_of_cover: `${runId} with-circle`,
        gi_item_name: `${runId} with-circle`,
        verification_status: "draft",
        postal_circle_id: circle!.id,
      })
      .select("id")
      .single();
    coverIds.push(cover!.id);

    const queue = await fetchReviewQueue(users.verifier.client);
    const row = queue.find((c) => c.id === cover!.id);

    expect(row?.postal_circles?.name).toBeTruthy();
  });
});
