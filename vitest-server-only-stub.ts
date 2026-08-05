// Test-only stand-in for the `server-only` package (see vitest.config.mts).
// That package intentionally throws when imported outside Next's own
// bundler, which is exactly what makes it useful in real builds — but it
// has no way to know Vitest importing route.ts directly is legitimate
// server-side testing, not a client-bundle leak. Aliased in for tests
// only; `next build` still uses the real package and still enforces the
// guard for real.
export {};
