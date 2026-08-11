"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowserClient";
import { fetchReviewQueue, type ReviewQueueCover } from "@/lib/reviewQueue";
import { fetchCurrentRole, type ProfileRole } from "@/lib/currentRole";

const BUCKET = "cover-images";

// Viewable by both Admin and Verifier — Admin's own RLS already grants full
// read access to this same data, and a read-only view of the queue is
// genuinely useful for a two-person back-office, not a risk. Only the
// Verifier role gets working action buttons (see the render below).
export default function ReviewQueuePage() {
  const router = useRouter();
  const [role, setRole] = useState<ProfileRole | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);
  const [queue, setQueue] = useState<ReviewQueueCover[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const imageUrlsRef = useRef<Record<string, string>>({});

  const loadQueue = useCallback(async () => {
    setLoadError(null);
    try {
      const rows = await fetchReviewQueue(supabaseBrowser);
      setQueue(rows);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        router.push("/login");
        return;
      }
      const r = await fetchCurrentRole(supabaseBrowser);
      if (cancelled) return;
      setRole(r);
      setRoleChecked(true);
      // Any role outside admin/verifier doesn't belong on this screen at
      // all (see the no-access render below) — don't bother loading the
      // queue for them, even though RLS would just return zero rows.
      if (r === "admin" || r === "verifier") {
        await loadQueue();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, loadQueue]);

  // Loads each row's image once (via the T-07 Storage RLS policy — no
  // server route) and caches it as an object URL, revoked on unmount.
  useEffect(() => {
    if (!queue) return;
    let cancelled = false;

    (async () => {
      for (const cover of queue) {
        if (!cover.image_file || imageUrlsRef.current[cover.id]) continue;
        const { data, error } = await supabaseBrowser.storage.from(BUCKET).download(cover.image_file);
        if (cancelled || error || !data) continue;
        const url = URL.createObjectURL(data);
        imageUrlsRef.current = { ...imageUrlsRef.current, [cover.id]: url };
        if (!cancelled) setImageUrls(imageUrlsRef.current);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queue]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(imageUrlsRef.current)) URL.revokeObjectURL(url);
    };
  }, []);

  const selected = queue?.find((c) => c.id === selectedId) ?? null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setFlagReason("");
    setActionError(null);
  };

  const handleAction = async (newStatus: "verified" | "flagged") => {
    if (!selected) return;
    if (newStatus === "flagged" && flagReason.trim() === "") {
      setActionError("A reason is required to flag a cover.");
      return;
    }

    setIsActing(true);
    setActionError(null);
    const { error } = await supabaseBrowser.rpc("verify_cover", {
      p_cover_id: selected.id,
      p_new_status: newStatus,
      p_reason: newStatus === "flagged" ? flagReason : undefined,
    });
    setIsActing(false);

    if (error) {
      // Defense-in-depth path only — the action buttons are hidden for
      // anyone but the Verifier role (see the render below), so this
      // should never actually fire from the UI. If it somehow does (e.g.
      // a stale role value, or the RPC called directly), show a clear
      // message rather than verify_cover()'s raw Postgres exception text.
      const isRoleRejection = /verifier role may call verify_cover/i.test(error.message);
      setActionError(isRoleRejection ? "You don't have permission to do this." : error.message);
      return;
    }

    setSelectedId(null);
    setFlagReason("");
    await loadQueue();
  };

  if (loadError) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <p className="text-red-600 text-sm">Could not load the review queue: {loadError}</p>
      </main>
    );
  }

  // Explicit "you don't belong here" state for any role outside
  // admin/verifier — including a genuinely role-less account (no profiles
  // row at all, e.g. a brand-new signup before handle_new_user() ran for
  // it) — rather than silently reusing Admin's read-only view the way it
  // did before. Defense in depth: the signup trigger means this shouldn't
  // normally happen anymore, but this doesn't rely on that alone.
  if (roleChecked && role !== "admin" && role !== "verifier") {
    return (
      <main className="mx-auto max-w-md p-8">
        <h1 className="text-xl font-semibold">No access</h1>
        <p className="mt-2 text-sm text-gray-500">
          Your account doesn&apos;t have access to this area yet — contact the admin.
        </p>
      </main>
    );
  }

  if (!roleChecked || !queue) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Review Queue</h1>
        <p className="text-sm text-gray-500">
          {queue.length} cover{queue.length === 1 ? "" : "s"} awaiting review (Draft and
          Flagged).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[2fr_3fr]">
        <div className="space-y-2">
          {queue.length === 0 && (
            <p className="text-sm text-gray-500">Nothing to review right now.</p>
          )}
          {queue.map((cover) => (
            <button
              key={cover.id}
              type="button"
              onClick={() => handleSelect(cover.id)}
              className={`flex w-full items-center gap-3 rounded border p-3 text-left ${
                selectedId === cover.id ? "border-black" : ""
              }`}
            >
              {imageUrls[cover.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrls[cover.id]}
                  alt=""
                  className="h-12 w-12 rounded object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded bg-gray-100" />
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{cover.name_of_cover || "(untitled)"}</p>
                <p className="truncate text-sm text-gray-500">{cover.gi_item_name}</p>
                <span
                  className={`text-xs font-medium ${
                    cover.verification_status === "flagged" ? "text-amber-700" : "text-gray-500"
                  }`}
                >
                  {cover.verification_status}
                </span>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="space-y-4 rounded-lg border p-6">
            {imageUrls[selected.id] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrls[selected.id]}
                alt=""
                className="max-h-80 w-full rounded object-contain"
              />
            )}

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-gray-500">Cover</dt>
              <dd>{selected.name_of_cover}</dd>
              <dt className="text-gray-500">GI Item</dt>
              <dd>{selected.gi_item_name}</dd>
              <dt className="text-gray-500">GI Registration No.</dt>
              <dd>{selected.gi_registration_number || "—"}</dd>
              <dt className="text-gray-500">Product Category</dt>
              <dd>{selected.product_category || "—"}</dd>
              <dt className="text-gray-500">Cancellation</dt>
              <dd>{selected.cancellation_description}</dd>
              <dt className="text-gray-500">Cachet</dt>
              <dd>{selected.cachet_description}</dd>
              <dt className="text-gray-500">Overall Description</dt>
              <dd>{selected.overall_description}</dd>
              <dt className="text-gray-500">Postal Circle</dt>
              <dd>{selected.postal_circles?.name || "Not recognized"}</dd>
              <dt className="text-gray-500">Place of Issue</dt>
              <dd>{selected.place_of_issue}</dd>
              <dt className="text-gray-500">Date of Issue</dt>
              <dd>{selected.date_of_issue}</dd>
              <dt className="text-gray-500">Status</dt>
              <dd>{selected.verification_status}</dd>
            </dl>

            {role === "verifier" ? (
              <div className="space-y-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => handleAction("verified")}
                  disabled={isActing}
                  className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
                >
                  Verify
                </button>

                <div className="space-y-2">
                  <label className="block text-sm font-medium" htmlFor="flag-reason">
                    Flag with reason
                  </label>
                  <textarea
                    id="flag-reason"
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    className="w-full rounded border px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Required — explain what needs correction"
                  />
                  <button
                    type="button"
                    onClick={() => handleAction("flagged")}
                    disabled={isActing || flagReason.trim() === ""}
                    className="rounded bg-amber-700 px-4 py-2 text-white disabled:opacity-50"
                  >
                    Flag
                  </button>
                </div>

                {actionError && <p className="text-red-600 text-sm">{actionError}</p>}
              </div>
            ) : (
              // No Verify/Flag controls at all for a non-Verifier viewer —
              // not just hidden-until-clicked, since a button that exists
              // only to 403 is the same class of bug the /login redirect
              // fix was meant to close. Admin can still see everything
              // above (their own RLS already grants that read), just not
              // act on it from here.
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500">
                  Viewing as {role ?? "a role"} — only the Verifier role can Verify or Flag
                  entries.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
