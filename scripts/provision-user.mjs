#!/usr/bin/env node
// One-off Admin/Verifier account provisioning (T-06.5, US-34). There is no
// public signup for this back-office — profiles.role is only ever set
// server-side, manually, for the known accounts (see Threat-Model.md's
// Elevation-of-Privilege row). Pre-confirms the account (email_confirm:
// true) since there's no self-service signup flow to gate in the first
// place — same pattern already proven by this repo's own integration
// tests' createTestUser() helper.
//
// Usage:
//   node --env-file=.env.local scripts/provision-user.mjs \
//     --email=someone@example.com --password=... --role=admin
//   (or: npm run provision:user -- --email=... --password=... --role=verifier)
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

if (!email || !password || !role) {
  console.error(
    "Usage: node --env-file=.env.local scripts/provision-user.mjs --email=... --password=... --role=admin|verifier"
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
