#!/usr/bin/env node
// Fails (non-zero exit) if the Supabase service-role key pattern appears in
// any git-tracked file, or in the built client-side bundle (.next/static).
//
// Why this exists: T-03 introduced this repo's first server-side use of
// the service-role key (src/lib/supabaseAdminClient.ts). Next.js already
// keeps non-NEXT_PUBLIC_ env vars out of the client bundle structurally,
// and the `server-only` import in that file turns an accidental
// client-side import into a build error — this script is a third,
// independent layer: a literal grep, not fancy, but cheap insurance
// against the key ending up somewhere neither of those mechanisms catches
// (e.g. hardcoded by mistake, or pasted into a committed file).
//
// Run via `npm run check:secrets`, wired into `npm run build`. Not yet
// wired into an actual CI pipeline — that lands with Session 7's CI/CD
// setup per docs/AI-Agent-Implementation-Brief.md; until then this only
// protects local builds, not PRs. See PROGRESS.md.
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Supabase's newer secret-key format (this project's keys use the
// sb_publishable_/sb_secret_ prefixes rather than the older JWT format).
// Update this if the project's key format ever changes.
const SECRET_KEY_PATTERN = /sb_secret_[A-Za-z0-9_-]+/;

const repoRoot = process.cwd();
const selfPath = path
  .relative(repoRoot, fileURLToPath(import.meta.url))
  .split(path.sep)
  .join("/");

let failed = false;

function checkTrackedFiles() {
  const files = execSync("git ls-files", { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter((f) => f !== selfPath);

  for (const file of files) {
    const full = path.join(repoRoot, file);
    if (!existsSync(full) || statSync(full).isDirectory()) continue;

    let content;
    try {
      content = readFileSync(full, "utf8");
    } catch {
      continue; // binary file, skip
    }

    if (SECRET_KEY_PATTERN.test(content)) {
      console.error(`Service-role key pattern found in tracked file: ${file}`);
      failed = true;
    }
  }
}

function checkBuildOutput() {
  const staticDir = path.join(repoRoot, ".next", "static");
  if (!existsSync(staticDir)) {
    console.log(
      "No .next/static build output found — skipping bundle check (run after `next build`)."
    );
    return;
  }

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(js|json|map)$/.test(entry.name)) {
        const content = readFileSync(full, "utf8");
        if (SECRET_KEY_PATTERN.test(content)) {
          console.error(`Service-role key pattern found in client bundle: ${full}`);
          failed = true;
        }
      }
    }
  }

  walk(staticDir);
}

checkTrackedFiles();
checkBuildOutput();

if (failed) {
  console.error("\nservice-role key leak check FAILED.");
  process.exit(1);
}

console.log("No service-role key pattern found in tracked files or client bundle.");
