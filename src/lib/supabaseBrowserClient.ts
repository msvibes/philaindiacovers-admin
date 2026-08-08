import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — check .env.local (see .env.example)."
  );
}

// Browser-only client: anon key (safe to expose), session persisted to
// localStorage by default. Used by the login page (email/password + Google
// SSO, T-06.5) and as the source of the access token authorizedFetch.ts
// attaches to the Admin-only API routes.
export const supabaseBrowser = createClient(supabaseUrl, anonKey);
