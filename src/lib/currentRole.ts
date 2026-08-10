import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileRole = "admin" | "verifier" | "collector";

// Looks up the signed-in caller's own role via current_profile_role() (T-04's
// SECURITY DEFINER helper) — confirmed callable via RPC by an authenticated
// client (relies on Postgres' default PUBLIC execute grant, never revoked in
// this project). Used only for UI routing/display — every real enforcement
// point (RLS, verify_cover(), requireRole()) re-derives the role server-side
// regardless, so a stale or spoofed value here can misroute the UI but can
// never grant real access.
export async function fetchCurrentRole(client: SupabaseClient): Promise<ProfileRole | null> {
  const { data, error } = await client.rpc("current_profile_role");
  if (error || !data) return null;
  return data as ProfileRole;
}
