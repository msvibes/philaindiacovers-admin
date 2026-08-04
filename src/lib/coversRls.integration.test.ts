import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Integration tier (see docs/Test-Strategy.md): talks to the real Supabase
// dev project, not a mock. This is T-04's literal fit criterion — "a
// Verifier-role client attempting a direct UPDATE on covers is rejected by
// the database, not just hidden in UI" — for all three roles, not just
// Verifier, since the interesting case is usually the negative one.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(supabaseUrl && anonKey && serviceRoleKey);

if (!hasCredentials) {
  console.warn(
    "[coversRls.integration.test] Skipped — NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are not all set in .env.local. This test needs a live Supabase connection."
  );
}

describe.skipIf(!hasCredentials)("covers RLS policies (T-04)", () => {
  const runId = `t04-${Date.now()}`;
  const admin = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false },
  });

  type TestUser = { userId: string; client: SupabaseClient };
  const users: Record<"admin" | "verifier" | "collector", TestUser> = {} as never;
  const coverIds: Record<"draft" | "flagged" | "verified", string> = {} as never;

  async function createTestUser(role: "admin" | "verifier" | "collector") {
    const email = `${runId}-${role}@example.test`;
    const password = "test-password-not-real-1234";

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      throw new Error(`Failed to create test ${role} user: ${createErr?.message}`);
    }

    const { error: profileErr } = await admin
      .from("profiles")
      .insert({ id: created.user.id, role });
    if (profileErr) {
      throw new Error(`Failed to set profiles.role for test ${role} user: ${profileErr.message}`);
    }

    const client = createClient(supabaseUrl!, anonKey!, {
      auth: { persistSession: false },
    });
    const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
    if (signInErr) {
      throw new Error(`Failed to sign in as test ${role} user: ${signInErr.message}`);
    }

    return { userId: created.user.id, client };
  }

  beforeAll(async () => {
    users.admin = await createTestUser("admin");
    users.verifier = await createTestUser("verifier");
    users.collector = await createTestUser("collector");

    const { data: covers, error: coversErr } = await admin
      .from("covers")
      .insert([
        { name_of_cover: `${runId} draft`, verification_status: "draft" },
        { name_of_cover: `${runId} flagged`, verification_status: "flagged" },
        { name_of_cover: `${runId} verified`, verification_status: "verified" },
      ])
      .select("id, verification_status");
    if (coversErr || !covers) {
      throw new Error(`Failed to seed test covers: ${coversErr?.message}`);
    }
    for (const c of covers) {
      coverIds[c.verification_status as "draft" | "flagged" | "verified"] = c.id;
    }
  }, 30_000);

  afterAll(async () => {
    await admin.from("covers").delete().in("id", Object.values(coverIds));
    for (const { userId } of Object.values(users)) {
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  }, 30_000);

  it("Admin can read draft, flagged, and verified covers", async () => {
    const { data, error } = await users.admin.client
      .from("covers")
      .select("id")
      .in("id", Object.values(coverIds));
    expect(error).toBeNull();
    expect(data?.map((r) => r.id).sort()).toEqual(Object.values(coverIds).sort());
  });

  it("Admin can update a cover", async () => {
    const { data, error } = await users.admin.client
      .from("covers")
      .update({ place_of_issue: "Updated by admin test" })
      .eq("id", coverIds.draft)
      .select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("Admin can insert and delete a cover", async () => {
    const { data: inserted, error: insertErr } = await users.admin.client
      .from("covers")
      .insert({ name_of_cover: `${runId} admin-insert`, verification_status: "draft" })
      .select();
    expect(insertErr).toBeNull();
    expect(inserted).toHaveLength(1);

    const { error: deleteErr, count } = await users.admin.client
      .from("covers")
      .delete({ count: "exact" })
      .eq("id", inserted![0].id);
    expect(deleteErr).toBeNull();
    expect(count).toBe(1);
  });

  it("Verifier can see draft and flagged covers, but not verified", async () => {
    const { data, error } = await users.verifier.client
      .from("covers")
      .select("id")
      .in("id", Object.values(coverIds));
    expect(error).toBeNull();
    const seenIds = data?.map((r) => r.id) ?? [];
    expect(seenIds).toContain(coverIds.draft);
    expect(seenIds).toContain(coverIds.flagged);
    expect(seenIds).not.toContain(coverIds.verified);
  });

  it("Verifier cannot update a cover — rejected by the database, not just hidden in UI", async () => {
    const { data, error } = await users.verifier.client
      .from("covers")
      .update({ place_of_issue: "Should never be written" })
      .eq("id", coverIds.draft)
      .select();
    // RLS with no matching UPDATE policy silently matches zero rows rather
    // than erroring — the real assertion is that nothing was affected.
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("Verifier cannot insert a cover", async () => {
    const { data, error } = await users.verifier.client
      .from("covers")
      .insert({ name_of_cover: `${runId} verifier-insert-should-fail` })
      .select();
    // Unlike UPDATE, a failed WITH CHECK on INSERT has no "existing row" to
    // just filter out, so Postgres raises an explicit RLS violation error.
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("Verifier cannot delete a cover", async () => {
    const { error, count } = await users.verifier.client
      .from("covers")
      .delete({ count: "exact" })
      .eq("id", coverIds.flagged);
    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  it("Collector can see only verified covers", async () => {
    const { data, error } = await users.collector.client
      .from("covers")
      .select("id")
      .in("id", Object.values(coverIds));
    expect(error).toBeNull();
    const seenIds = data?.map((r) => r.id) ?? [];
    expect(seenIds).toEqual([coverIds.verified]);
  });

  it("Collector cannot update, insert, or delete covers", async () => {
    const { data: updateData, error: updateErr } = await users.collector.client
      .from("covers")
      .update({ place_of_issue: "Should never be written" })
      .eq("id", coverIds.verified)
      .select();
    expect(updateErr).toBeNull();
    expect(updateData).toHaveLength(0);

    const { error: insertErr } = await users.collector.client
      .from("covers")
      .insert({ name_of_cover: `${runId} collector-insert-should-fail` });
    expect(insertErr).not.toBeNull();

    const { error: deleteErr, count } = await users.collector.client
      .from("covers")
      .delete({ count: "exact" })
      .eq("id", coverIds.verified);
    expect(deleteErr).toBeNull();
    expect(count).toBe(0);
  });
});
