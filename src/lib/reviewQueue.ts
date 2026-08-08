import type { SupabaseClient } from "@supabase/supabase-js";

export type ReviewQueueCover = {
  id: string;
  image_file: string | null;
  name_of_cover: string | null;
  gi_item_name: string | null;
  gi_registration_number: string | null;
  product_category: string | null;
  cancellation_description: string | null;
  cachet_description: string | null;
  overall_description: string | null;
  place_of_issue: string | null;
  date_of_issue: string | null;
  verification_status: "draft" | "flagged";
  postal_circles: { name: string } | null;
};

// The Verifier's review queue (T-07). No server-side Route Handler here —
// T-04's RLS already restricts a Verifier's own authenticated client to
// exactly draft/flagged covers, so this is a normal RLS-permitted SELECT,
// not a service-role bypass. The explicit status filter below is a display
// concern (query only what the queue shows, in a defined order), not the
// security boundary — RLS is authoritative regardless of this filter.
export async function fetchReviewQueue(client: SupabaseClient): Promise<ReviewQueueCover[]> {
  const { data, error } = await client
    .from("covers")
    .select(
      `id, image_file, name_of_cover, gi_item_name, gi_registration_number,
       product_category, cancellation_description, cachet_description,
       overall_description, place_of_issue, date_of_issue,
       verification_status, postal_circles(name)`
    )
    .in("verification_status", ["draft", "flagged"])
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ReviewQueueCover[];
}
