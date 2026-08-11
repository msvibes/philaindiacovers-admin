#!/usr/bin/env node
// Admin/Verifier account provisioning (T-06.5, US-34). There is no public
// signup for this back-office — profiles.role is only ever set
// server-side, manually, for the known accounts (see Threat-Model.md's
// Elevation-of-Privilege row). Handles two cases:
//   1. Email not found: creates a new pre-confirmed user (email_confirm:
//      true — no self-service signup flow to gate in the first place) and
//      sets profiles.role. Requires --password.
//   2. Email already exists (e.g. a Google-SSO account that signed up
//      itself, defaulting to profiles.role = 'collector'): just updates
//      profiles.role for that existing user. --password is ignored here —
//      Google-only accounts have no password to set, and this script only
//      ever touches the role for an existing account, never credentials.
//
// Usage:
//   node --env-file=.env.local scripts/provision-user.mjs \
//     --email=someone@example.com --password=... --role=admin
//   node --env-file=.env.local scripts/provision-user.mjs \
//     --email=someone@example.com --role=verifier   (existing user, no password needed)
//   (or: npm run provision:user -- --email=... --role=admin|verifier)
import { createClient } from "@supabase/supabase-js";

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([a-z]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

const { email, password, role } = parseArgs();

if (!email || !role) {
  console.error(
    "Usage: node --env-file=.env.local scripts/provision-user.mjs --email=... --role=admin|verifier [--password=...]\n" +
      "  --password is required only when the email doesn't already have an account."
  );
  process.exit(1);
}

if (role !== "admin" && role !== "verifier") {
  console.error(
    `Invalid role "${role}" — must be "admin" or "verifier". ("collector" is the self-service default and isn't provisioned this way.)`
  );
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — run with `node --env-file=.env.local ...` (see .env.example)."
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

// Small user base (this is a two-person back-office) — one page is always
// enough. No dedicated "get user by email" in the admin API, so list +
// find is the straightforward option here.
const { data: listData, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (listError) {
  console.error(`Failed to list users: ${listError.message}`);
  process.exit(1);
}
const existing = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

if (existing) {
  // profiles.role is upserted, not just updated — defensive: if this
  // existing auth.users row somehow has no profiles row yet (shouldn't
  // happen per the no-signup-trigger gotcha, but this script is meant to
  // be safe to (re)run), this still leaves it correctly provisioned
  // rather than silently no-op'ing.
  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: existing.id, role }, { onConflict: "id" });

  if (profileError) {
    console.error(`Failed to update profiles.role for ${email}: ${profileError.message}`);
    process.exit(1);
  }

  console.log(`Updated existing account to ${role}: ${email} (${existing.id})`);
  process.exit(0);
}

if (!password) {
  console.error(
    `No existing account found for ${email} — --password is required to create a new one.`
  );
  process.exit(1);
}

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (createError || !created.user) {
  console.error(`Failed to create user: ${createError?.message}`);
  process.exit(1);
}

// No trigger auto-creates a profiles row on signup (deliberately — see
// requireRole.ts / Threat-Model.md), so it's inserted explicitly here.
const { error: profileError } = await admin
  .from("profiles")
  .insert({ id: created.user.id, role });

if (profileError) {
  console.error(
    `User created (${created.user.id}) but failed to set profiles.role: ${profileError.message}`
  );
  process.exit(1);
}

console.log(`Created ${role} account: ${email} (${created.user.id})`);
