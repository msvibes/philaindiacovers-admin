import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type TestRole = "admin" | "verifier" | "collector";

export type TestUser = { userId: string; client: SupabaseClient; accessToken: string };

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

  const { error: profileErr } = await admin
    .from("profiles")
    .insert({ id: created.user.id, role });
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
