import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { requireRole } from "@/lib/requireRole";

// Access-control gap open since T-03, closed by T-06.5: every request now
// needs a verified Admin session (see requireRole.ts) — a real server-side
// check against Supabase Auth, not a client-supplied claim.
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, "admin");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const giItemNames = Array.isArray(body?.giItemNames)
    ? body.giItemNames.filter(
        (v: unknown): v is string => typeof v === "string" && v.length > 0
      )
    : [];

  if (giItemNames.length === 0) {
    return NextResponse.json({ existing: [] });
  }

  const { data, error } = await supabaseAdmin
    .from("covers")
    .select("gi_item_name, date_of_issue")
    .in("gi_item_name", giItemNames);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ existing: data ?? [] });
}
