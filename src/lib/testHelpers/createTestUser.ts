import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type TestRole = "admin" | "verifier" | "collector";

export type TestUser = { userId: string; client: SupabaseClient; accessToken: string };

// "JWT issued at future" from the immediately-following profiles upsert
// (createUser() -> instantly write against that brand-new user's row) is
// a real, intermittent characteristic of that create-then-immediately-act
// sequence — confirmed on two genuinely different environments (this
// machine's own clock, and a fresh GitHub-hosted CI runner), not a bug
// tied to one machine. Retried narrowly, only for this exact error
// signature; anything else still throws immediately, unretried — masking
// a real failure behind a retry would be worse than the flake itself.
const JWT_ISSUED_AT_FUTURE = "JWT issued at future";
const PROFILE_UPSERT_MAX_ATTEMPTS = 3;
const PROFILE_UPSERT_RETRY_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Shared throwaway-account helper for integration tests (T-04's pattern,
// reused by T-06/T-06.5): creates a real Supabase Auth user + matching
// profiles row, signs in via the anon key, and returns both the signed-in
// client and its access token — the latter needed by tests that call Route
// Handlers directly with an Authorization header (requireRole.ts).
export async function createTestUser(
  admin: SupabaseClient,
  supabaseUrl: string,
  anonKey: string,
  runId: string,
  role: TestRole
): Promise<TestUser> {
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

  // handle_new_user() (20260811182123_auto_create_profile_on_signup.sql)
  // already auto-created a profiles row with role='collector' the moment
  // createUser() ran — upsert to the actually-requested role rather than
  // insert, which would now hit a duplicate-key conflict.
  let profileErr: { message: string } | null = null;
  for (let attempt = 1; attempt <= PROFILE_UPSERT_MAX_ATTEMPTS; attempt++) {
    const result = await admin
      .from("profiles")
      .upsert({ id: created.user.id, role }, { onConflict: "id" });
    profileErr = result.error;
    if (!profileErr) break;
    if (!profileErr.message.includes(JWT_ISSUED_AT_FUTURE) || attempt === PROFILE_UPSERT_MAX_ATTEMPTS) {
      break;
    }
    await sleep(PROFILE_UPSERT_RETRY_DELAY_MS);
  }
  if (profileErr) {
    throw new Error(`Failed to set profiles.role for test ${role} user: ${profileErr.message}`);
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr || !signInData.session) {
    throw new Error(`Failed to sign in as test ${role} user: ${signInErr?.message}`);
  }

  return { userId: created.user.id, client, accessToken: signInData.session.access_token };
}

export async function deleteTestUser(admin: SupabaseClient, userId: string): Promise<void> {
  await admin.from("profiles").delete().eq("id", userId);
  await admin.auth.admin.deleteUser(userId);
}
