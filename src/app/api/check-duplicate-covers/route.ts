import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { requireRole } from "@/lib/requireRole";
import { sanitizeCsvCell } from "@/lib/sanitizeCsvCell";
import { extractGiRegistrationNumber } from "@/lib/extractGiRegistrationNumber";

// Access-control gap open since T-03, closed by T-06.5: every request now
// needs a verified Admin session (see requireRole.ts) — a real server-side
// check against Supabase Auth, not a client-supplied claim.
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, "admin");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const rawGiItemNames: string[] = Array.isArray(body?.giItemNames)
    ? body.giItemNames.filter(
        (v: unknown): v is string => typeof v === "string" && v.length > 0
      )
    : [];

  // Same root cause as import/page.tsx's own duplicate-comparison bug,
  // one step earlier: the client sends the raw "Name of the GI Tag /
  // Item" text (e.g. "Tezpur Litchi (GI No. 438)"), but covers.gi_item_name
  // is always stored cleaned (confirm-import/route.ts always strips the
  // annotation via extractGiRegistrationNumber before inserting). Querying
  // .in("gi_item_name", rawGiItemNames) with the raw text silently
  // returns zero rows for anything with a "(GI No. ...)" annotation —
  // proven directly against the live database, not assumed — so those
  // rows never even reached the client as candidates, regardless of how
  // correct the client's own comparison logic is. Cleaned here, not on
  // the client, matching this route's own existing trust-boundary
  // stance (never trust a client-supplied value for a query that
  // matters — see confirm-import/route.ts's identical candidateGiItemNames
  // construction, which this mirrors exactly) and closing the gap for
  // every future caller of this endpoint, not just today's.
  const giItemNames = Array.from(
    new Set(
      rawGiItemNames
        .map((name) => sanitizeCsvCell(name))
        .map((name) => extractGiRegistrationNumber(name).cleanedName)
        .filter(Boolean)
    )
  );

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
