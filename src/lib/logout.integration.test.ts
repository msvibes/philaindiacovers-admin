import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, type TestUser } from "@/lib/testHelpers/createTestUser";

// Integration tier (see docs/Test-Strategy.md). Proves signOut() is a real
// server-side session revocation, not just a client-side localStorage
// clear: a stale access token captured before signOut() must be rejected
// by getUser() afterward — the exact mechanism requireRole() (T-06.5) uses
// to gate /api/check-duplicate-covers and /api/confirm-import, so this
// also proves those routes become unreachable with a logged-out token, not
// just that the login page redirects.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(supabaseUrl && anonKey && serviceRoleKey);

if (!hasCredentials) {
  console.warn(
    "[logout.integration.test] Skipped — NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are not all set in .env.local."
  );
}

describe.skipIf(!hasCredentials)("signOut() (logout, FR-30's back-office equivalent)", () => {
  const runId = `logout-${Date.now()}`;
  let admin: SupabaseClient;
  let user: TestUser;

  beforeAll(async () => {
    admin = createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false } });
    user = await createTestUser(admin, supabaseUrl!, anonKey!, runId, "verifier");
  }, 30_000);

  afterAll(async () => {
    await deleteTestUser(admin, user.userId);
  }, 30_000);

  it("revokes the session server-side — a stale access token is rejected afterward, not just cleared client-side", async () => {
    const staleToken = user.accessToken;

    // Sanity check: the token is genuinely valid before signOut().
    const preCheck = await user.client.auth.getUser(staleToken);
    expect(preCheck.error).toBeNull();
    expect(preCheck.data.user?.id).toBe(user.userId);

    const { error: signOutError } = await user.client.auth.signOut();
    expect(signOutError).toBeNull();

    // A different client instance, holding only the now-stale token — the
    // same shape as requireRole() verifying a bearer header — must be
    // rejected by the real Supabase Auth server, not a local check.
    const freshClient = createClient(supabaseUrl!, anonKey!, { auth: { persistSession: false } });
    const { data, error } = await freshClient.auth.getUser(staleToken);

    expect(error).not.toBeNull();
    expect(data.user).toBeNull();
  });
});
