import "server-only";
import { createClient } from "@supabase/supabase-js";

// Uses the service_role key, which bypasses RLS entirely. NEVER import this
// from a client component or anything that ends up in the browser bundle —
// the `server-only` import above turns that into a build error, and
// `npm run check:secrets` (wired into `npm run build`) independently greps
// for the key pattern in tracked files and the built client bundle as
// defense-in-depth. See PROGRESS.md for the access-control gap this
// currently has (no auth yet) and the plan to close it.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — check .env.local (see .env.example)."
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
