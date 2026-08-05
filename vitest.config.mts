import path from "node:path";
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig({
  // Mirrors tsconfig.json's "@/*" -> "./src/*" path alias. Next.js's own
  // bundler resolves this automatically; Vitest needs it configured
  // separately since it uses Vite, not Next's build pipeline. Needed as
  // of T-05's confirm-import route tests, which import route.ts directly.
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      // See vitest-server-only-stub.ts — test-only, next build still uses
      // the real package.
      "server-only": path.resolve(import.meta.dirname, "./vitest-server-only-stub.ts"),
    },
  },
  test: {
    // Loads .env.local (and friends) into process.env for tests. Needed
    // for the T-04 RLS integration test, which talks to the real
    // Supabase dev project. The existing pure unit tests don't reference
    // env vars, so this is a no-op for them.
    env: loadEnv("", process.cwd(), ""),
  },
});
