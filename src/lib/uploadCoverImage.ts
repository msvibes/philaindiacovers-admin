import { supabaseBrowser } from "./supabaseBrowserClient";
import { sanitizeStorageKey } from "./sanitizeStorageKey";

const BUCKET = "cover-images";

export type UploadCoverImageResult =
  | { ok: true; storagePath: string }
  | { ok: false; error: string };

// Uploads directly from the browser to Storage, bypassing the Next.js API
// route entirely — Vercel Functions cap request bodies at 4.5MB on every
// plan (confirmed against Vercel's own current docs, not assumed), so
// routing image bytes through a server route doesn't scale past a small
// batch. Requires the Admin-only storage.objects INSERT policy
// (20260916133752_cover_images_admin_write_policy.sql) — supabaseBrowser
// carries the caller's own session, so this only succeeds for an Admin.
//
// Same path shape confirm-import/route.ts already produces
// (${randomUUID()}/${sanitizeStorageKey(name)}), reusing sanitizeStorageKey
// rather than re-deriving Storage-safe-key logic here.
export async function uploadCoverImage(file: File): Promise<UploadCoverImageResult> {
  // crypto.randomUUID() is the Web Crypto API global, available in every
  // browser and in Node without an import — unlike node:crypto's
  // randomUUID, which isn't safe to import into this client-side module.
  const storagePath = `${crypto.randomUUID()}/${sanitizeStorageKey(file.name)}`;
  const { error } = await supabaseBrowser.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type || "application/octet-stream" });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, storagePath };
}

export async function deleteCoverImage(storagePath: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseBrowser.storage.from(BUCKET).remove([storagePath]);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// Runs a bounded number of upload tasks concurrently rather than firing
// every File.upload() at once (unbounded Promise.all against ~500 files
// would open far more simultaneous connections than useful) or strictly
// sequentially (needlessly slow for many small files). Order-preserving:
// results[i] corresponds to tasks[i].
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await task(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
