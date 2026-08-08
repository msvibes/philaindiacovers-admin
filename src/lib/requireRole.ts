import "server-only";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabaseAdminClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — check .env.local (see .env.example)."
  );
}

type Role = "admin" | "verifier" | "collector";

// Server-side session/role guard for Route Handlers (T-06.5), closing the
// access-control gap open since T-03/T-05 on /api/check-duplicate-covers
// and /api/confirm-import.
//
// The browser attaches Authorization: Bearer <access_token> (see
// authorizedFetch.ts). getUser(token) round-trips to Supabase Auth to
// verify that token server-side — it is NOT just decoding a
// client-supplied claim. The role lookup then goes through the
// service-role client, the same trusted server context these routes
// already use for their real work, bypassing RLS deliberately (there's no
// RLS policy letting a user read their own profiles row anyway).
export async function requireRole(
  request: Request,
  allowedRole: Role
): Promise<{ userId: string } | NextResponse> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const anonClient = createClient(supabaseUrl!, anonKey!, {
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await anonClient.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || profile?.role !== allowedRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { userId: userData.user.id };
}
