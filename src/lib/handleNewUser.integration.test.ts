import { afterAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

// Integration tier (see docs/Test-Strategy.md). Proves handle_new_user()
// (20260811182123_auto_create_profile_on_signup.sql) actually closes the
// root cause found via a real Google sign-in: before this trigger existed,
// no auth.users row ever got a matching profiles row automatically, so
// every self-service signup (Google SSO today; email/password self-signup
// in the future consumer app) ended up with current_profile_role() = NULL
// instead of the schema's stated default of 'collector'.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(supabaseUrl && anonKey && serviceRoleKey);

if (!hasCredentials) {
  console.warn(
    "[handleNewUser.integration.test] Skipped — NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are not all set in .env.local."
  );
}

describe.skipIf(!hasCredentials)("handle_new_user() signup trigger", () => {
  const runId = `signup-trigger-${Date.now()}`;
  const admin = createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false } });
  const createdUserIds: string[] = [];

  afterAll(async () => {
    for (const id of createdUserIds) {
      await admin.from("profiles").delete().eq("id", id);
      await admin.auth.admin.deleteUser(id);
    }
  }, 30_000);

  it("auto-creates a profiles row with role='collector' the moment a new auth user is created — no manual insert needed", async () => {
    const email = `${runId}-a@example.test`;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: "test-password-not-real-1234",
      email_confirm: true,
    });
    if (createErr || !created.user) throw new Error(`createUser failed: ${createErr?.message}`);
    createdUserIds.push(created.user.id);

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", created.user.id)
      .single();

    expect(profileErr).toBeNull();
    expect(profile?.role).toBe("collector");
  });

  it("current_profile_role() correctly resolves to 'collector' for a freshly self-signed-up account, not NULL", async () => {
    const email = `${runId}-b@example.test`;
    const password = "test-password-not-real-1234";
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr || !created.user) throw new Error(`createUser failed: ${createErr?.message}`);
    createdUserIds.push(created.user.id);

    const anon = createClient(supabaseUrl!, anonKey!, { auth: { persistSession: false } });
    await anon.auth.signInWithPassword({ email, password });

    const { data: role, error: roleErr } = await anon.rpc("current_profile_role");
    expect(roleErr).toBeNull();
    expect(role).toBe("collector");
  });
});
