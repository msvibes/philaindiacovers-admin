import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

// SECURITY GAP (tracked in PROGRESS.md, not yet fixed): this route has no
// access control. Auth/roles don't exist yet anywhere in this app, so this
// is a real, currently-open way for anyone who finds the endpoint to
// enumerate GI Item / Date of Issue pairs across ALL covers, including
// draft/flagged ones that aren't meant to be public. Needs to be locked
// down (likely tied to T-04's Admin auth) before this goes past local dev.
export async function POST(request: NextRequest) {
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
