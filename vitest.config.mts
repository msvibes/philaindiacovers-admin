import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig({
  test: {
    // Loads .env.local (and friends) into process.env for tests. Needed
    // for the T-04 RLS integration test, which talks to the real
    // Supabase dev project. The existing pure unit tests don't reference
    // env vars, so this is a no-op for them.
    env: loadEnv("", process.cwd(), ""),
  },
});
