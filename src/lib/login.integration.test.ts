import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser } from "@/lib/testHelpers/createTestUser";

// Integration tier (see docs/Test-Strategy.md). T-06.5's own Verification
// Check: "A real Verifier test account can log in through the UI and reach
// an authenticated session." The login page itself is a thin wrapper over
// supabase.auth.signInWithPassword() — this proves that call actually
// succeeds/fails correctly against the real dev project, independent of
// the two Route Handler tests, which only prove what happens *after* a
// session already exists.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(supabaseUrl && anonKey && serviceRoleKey);

if (!hasCredentials) {
  console.warn(
    "[login.integration.test] Skipped — NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are not all set in .env.local."
  );
}

describe.skipIf(!hasCredentials)("email/password login (T-06.5)", () => {
  const runId = `t065-login-${Date.now()}`;
  const email = `${runId}-verifier@example.test`;
  const password = "test-password-not-real-1234";
  let admin: SupabaseClient;
  let userId: string;

  beforeAll(async () => {
    admin = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false },
    });
    const user = await createTestUser(admin, supabaseUrl!, anonKey!, runId, "verifier");
    userId = user.userId;
  }, 30_000);

  afterAll(async () => {
    await deleteTestUser(admin, userId);
  }, 30_000);

  it("succeeds with the correct password and returns a real session", async () => {
    const client = createClient(supabaseUrl!, anonKey!, { auth: { persistSession: false } });
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    expect(error).toBeNull();
    expect(data.session?.access_token).toBeTruthy();
    expect(data.user?.id).toBe(userId);
  });

  it("fails with the wrong password, producing no session", async () => {
    const client = createClient(supabaseUrl!, anonKey!, { auth: { persistSession: false } });
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password: "definitely-the-wrong-password",
    });

    expect(error).not.toBeNull();
    expect(data.session).toBeNull();
  });

  it("provisioned accounts are pre-confirmed — no email-verification step blocks login", async () => {
    // createTestUser() (and scripts/provision-user.mjs, the real
    // provisioning path) both set email_confirm: true at creation time —
    // this is what the previous "succeeds" test already implicitly relies
    // on. Asserted explicitly here since it's the actual answer to "does
    // login require email verification first": no, because there's no
    // self-service signup state to be unverified in.
    const { data } = await admin.auth.admin.getUserById(userId);
    expect(data.user?.email_confirmed_at).toBeTruthy();
  });
});
