import type { ExistingCoverKey } from "./isDuplicateCover";

// Goes through the server-side /api/check-duplicate-covers route rather
// than querying Supabase directly from the browser: `covers` has no RLS or
// grants for the anon role yet (RLS is T-04), so a duplicate check across
// ALL statuses — which the browser's anon key cannot legitimately do —
// has to happen server-side with the service-role key instead.
export async function fetchExistingCoverKeys(
  giItemNames: string[]
): Promise<ExistingCoverKey[]> {
  if (giItemNames.length === 0) return [];

  const res = await fetch("/api/check-duplicate-covers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ giItemNames }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body.error ?? `Duplicate check failed (${res.status})`);
  }

  return body.existing ?? [];
}
