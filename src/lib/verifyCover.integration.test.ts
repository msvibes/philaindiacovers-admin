import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Integration tier (see docs/Test-Strategy.md): talks to the real Supabase
// dev project, not a mock. T-06's fit criterion — calling verify_cover()
// with status='flagged' and no reason fails; with a reason, succeeds and
// produces exactly one new audit-log row — plus the negative case that
// only the Verifier role can call it at all (per ADR-005).

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(supabaseUrl && anonKey && serviceRoleKey);

if (!hasCredentials) {
  console.warn(
    "[verifyCover.integration.test] Skipped — NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are not all set in .env.local. This test needs a live Supabase connection."
  );
}

describe.skipIf(!hasCredentials)("verify_cover() (T-06)", () => {
  const runId = `t06-${Date.now()}`;
  const admin = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false },
  });

  type TestUser = { userId: string; client: SupabaseClient };
  const users: Record<"admin" | "verifier" | "collector", TestUser> = {} as never;
  const coverIds: string[] = [];

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

  async function createDraftCover(suffix: string) {
    const { data, error } = await admin
      .from("covers")
      .insert({ name_of_cover: `${runId} ${suffix}`, verification_status: "draft" })
      .select("id")
      .single();
    if (error || !data) {
      throw new Error(`Failed to seed draft cover: ${error?.message}`);
    }
    coverIds.push(data.id);
    return data.id as string;
  }

  async function createFlaggedCover(suffix: string) {
    const { data, error } = await admin
      .from("covers")
      .insert({
        name_of_cover: `${runId} ${suffix}`,
        verification_status: "flagged",
        place_of_issue: "Original place of issue",
      })
      .select("id")
      .single();
    if (error || !data) {
      throw new Error(`Failed to seed flagged cover: ${error?.message}`);
    }
    coverIds.push(data.id);
    return data.id as string;
  }

  async function createVerifiedCover(suffix: string) {
    const { data, error } = await admin
      .from("covers")
      .insert({
        name_of_cover: `${runId} ${suffix}`,
        verification_status: "verified",
        place_of_issue: "Original place of issue",
      })
      .select("id")
      .single();
    if (error || !data) {
      throw new Error(`Failed to seed verified cover: ${error?.message}`);
    }
    coverIds.push(data.id);
    return data.id as string;
  }

  beforeAll(async () => {
    users.admin = await createTestUser("admin");
    users.verifier = await createTestUser("verifier");
    users.collector = await createTestUser("collector");
  }, 30_000);

  afterAll(async () => {
    await admin.from("verification_audit_log").delete().in("cover_id", coverIds);
    await admin.from("covers").delete().in("id", coverIds);
    for (const { userId } of Object.values(users)) {
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  }, 30_000);

  it("Verifier flagging without a reason fails, and writes no audit row", async () => {
    const coverId = await createDraftCover("flag-no-reason");

    const { error } = await users.verifier.client.rpc("verify_cover", {
      p_cover_id: coverId,
      p_new_status: "flagged",
    });
    expect(error).not.toBeNull();

    const { data: cover } = await admin
      .from("covers")
      .select("verification_status")
      .eq("id", coverId)
      .single();
    expect(cover?.verification_status).toBe("draft");

    const { data: logs } = await admin
      .from("verification_audit_log")
      .select("id")
      .eq("cover_id", coverId);
    expect(logs).toHaveLength(0);
  });

  it("Verifier flagging with an empty-string reason fails the same as null, and writes no audit row", async () => {
    const coverId = await createDraftCover("flag-empty-string-reason");

    const { error } = await users.verifier.client.rpc("verify_cover", {
      p_cover_id: coverId,
      p_new_status: "flagged",
      p_reason: "",
    });
    expect(error).not.toBeNull();

    const { data: cover } = await admin
      .from("covers")
      .select("verification_status")
      .eq("id", coverId)
      .single();
    expect(cover?.verification_status).toBe("draft");

    const { data: logs } = await admin
      .from("verification_audit_log")
      .select("id")
      .eq("cover_id", coverId);
    expect(logs).toHaveLength(0);
  });

  it("Verifier flagging with a reason succeeds and produces exactly one audit-log row", async () => {
    const coverId = await createDraftCover("flag-with-reason");

    const { error } = await users.verifier.client.rpc("verify_cover", {
      p_cover_id: coverId,
      p_new_status: "flagged",
      p_reason: "Missing cachet detail",
    });
    expect(error).toBeNull();

    const { data: cover } = await admin
      .from("covers")
      .select("verification_status, verified_by, verified_at")
      .eq("id", coverId)
      .single();
    expect(cover?.verification_status).toBe("flagged");
    expect(cover?.verified_by).toBe(users.verifier.userId);
    expect(cover?.verified_at).not.toBeNull();

    const { data: logs } = await admin
      .from("verification_audit_log")
      .select("action, reason, performed_by")
      .eq("cover_id", coverId);
    expect(logs).toHaveLength(1);
    expect(logs![0].action).toBe("flagged");
    expect(logs![0].reason).toBe("Missing cachet detail");
    expect(logs![0].performed_by).toBe(users.verifier.userId);
  });

  it("Verifier verifying (no reason needed) succeeds and produces exactly one audit-log row", async () => {
    const coverId = await createDraftCover("verify");

    const { error } = await users.verifier.client.rpc("verify_cover", {
      p_cover_id: coverId,
      p_new_status: "verified",
    });
    expect(error).toBeNull();

    const { data: cover } = await admin
      .from("covers")
      .select("verification_status")
      .eq("id", coverId)
      .single();
    expect(cover?.verification_status).toBe("verified");

    const { data: logs } = await admin
      .from("verification_audit_log")
      .select("action, reason")
      .eq("cover_id", coverId);
    expect(logs).toHaveLength(1);
    expect(logs![0].action).toBe("verified");
    expect(logs![0].reason).toBeNull();
  });

  it("rejects an invalid p_new_status", async () => {
    const coverId = await createDraftCover("invalid-status");

    const { error } = await users.verifier.client.rpc("verify_cover", {
      p_cover_id: coverId,
      p_new_status: "draft",
    });
    expect(error).not.toBeNull();
  });

  it("Admin cannot call verify_cover() — rejected by the database, not just hidden in UI", async () => {
    const coverId = await createDraftCover("admin-forbidden");

    const { error } = await users.admin.client.rpc("verify_cover", {
      p_cover_id: coverId,
      p_new_status: "verified",
    });
    expect(error).not.toBeNull();

    const { data: cover } = await admin
      .from("covers")
      .select("verification_status")
      .eq("id", coverId)
      .single();
    expect(cover?.verification_status).toBe("draft");
  });

  it("Collector cannot call verify_cover()", async () => {
    const coverId = await createDraftCover("collector-forbidden");

    const { error } = await users.collector.client.rpc("verify_cover", {
      p_cover_id: coverId,
      p_new_status: "verified",
    });
    expect(error).not.toBeNull();
  });

  it("FR-24: Admin correcting a Flagged cover's metadata via a plain UPDATE resets it to draft, logged as correction_resubmitted", async () => {
    const coverId = await createFlaggedCover("admin-correction");

    const { data: updated, error } = await users.admin.client
      .from("covers")
      .update({ place_of_issue: "Corrected place of issue" })
      .eq("id", coverId)
      .select("verification_status, place_of_issue")
      .single();
    expect(error).toBeNull();
    expect(updated?.place_of_issue).toBe("Corrected place of issue");
    expect(updated?.verification_status).toBe("draft");

    const { data: logs } = await admin
      .from("verification_audit_log")
      .select("action, performed_by")
      .eq("cover_id", coverId);
    expect(logs).toHaveLength(1);
    expect(logs![0].action).toBe("correction_resubmitted");
    expect(logs![0].performed_by).toBe(users.admin.userId);
  });

  it("FR-24: Admin correcting a Verified cover's metadata via a plain UPDATE resets it to draft, logged as correction_resubmitted", async () => {
    const coverId = await createVerifiedCover("admin-correction-verified");

    const { data: updated, error } = await users.admin.client
      .from("covers")
      .update({ place_of_issue: "Corrected place of issue" })
      .eq("id", coverId)
      .select("verification_status, place_of_issue")
      .single();
    expect(error).toBeNull();
    expect(updated?.place_of_issue).toBe("Corrected place of issue");
    // A Verified cover's data must not silently drift out of accuracy while
    // still showing as trustworthy — same guardrail as the Flagged case,
    // arguably more important since Verified is what collectors see.
    expect(updated?.verification_status).toBe("draft");

    const { data: logs } = await admin
      .from("verification_audit_log")
      .select("action, performed_by")
      .eq("cover_id", coverId);
    expect(logs).toHaveLength(1);
    expect(logs![0].action).toBe("correction_resubmitted");
    expect(logs![0].performed_by).toBe(users.admin.userId);
  });

  it("FR-24: the trigger does not fire on a Verifier re-flagging an already-flagged cover via verify_cover()", async () => {
    const coverId = await createFlaggedCover("verifier-reflag");

    const { error } = await users.verifier.client.rpc("verify_cover", {
      p_cover_id: coverId,
      p_new_status: "flagged",
      p_reason: "Updated reason after a second look",
    });
    expect(error).toBeNull();

    const { data: cover } = await admin
      .from("covers")
      .select("verification_status")
      .eq("id", coverId)
      .single();
    // Must still be 'flagged' — the correction-reset trigger only fires for
    // the Admin role, so it must not undo verify_cover()'s own status write.
    expect(cover?.verification_status).toBe("flagged");

    const { data: logs } = await admin
      .from("verification_audit_log")
      .select("action")
      .eq("cover_id", coverId);
    expect(logs).toHaveLength(1);
    expect(logs![0].action).toBe("flagged");
  });

  it("FR-24: correcting a Draft cover's metadata does not change its status", async () => {
    const coverId = await createDraftCover("admin-correction-on-draft");

    const { data: updated, error } = await users.admin.client
      .from("covers")
      .update({ place_of_issue: "Edited while still draft" })
      .eq("id", coverId)
      .select("verification_status")
      .single();
    expect(error).toBeNull();
    expect(updated?.verification_status).toBe("draft");

    const { data: logs } = await admin
      .from("verification_audit_log")
      .select("id")
      .eq("cover_id", coverId);
    expect(logs).toHaveLength(0);
  });
});
