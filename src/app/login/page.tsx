"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowserClient";
import { fetchCurrentRole } from "@/lib/currentRole";

// Google's OAuth Client ID/Secret + Manual Linking are now configured in
// the Supabase dashboard (2026-08-11) — was confirmed genuinely broken
// without this (see API-Integration-Contracts.md's Route Handler
// authentication section and PROGRESS.md for the prior live-tested
// failure mode). The Verifier-via-Google redirect path is still an
// explicit open item (PROGRESS.md) — not yet exercised end-to-end.
const GOOGLE_SSO_ENABLED = true;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    if (error) {
      setIsSubmitting(false);
      setError(error.message);
      return;
    }

    // Role-based, not hard-coded — a Verifier landing on /import (the
    // Admin's screen) after every successful sign-in was a real bug, found
    // via manual testing. Neither /import nor /review require this lookup
    // to be correct for security (both re-check role themselves), but a
    // direct redirect avoids an unnecessary extra hop for the common case.
    const role = await fetchCurrentRole(supabaseBrowser);
    setIsSubmitting(false);

    if (role === "admin") {
      router.push("/import");
      return;
    }
    if (role === "verifier") {
      router.push("/review");
      return;
    }

    // No known back-office role (or the lookup failed) — don't leave the
    // browser signed in with nowhere valid to go.
    await supabaseBrowser.auth.signOut();
    setError("This account doesn't have back-office access.");
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    // Can't look up role before redirecting here — the OAuth round-trip is
    // a full-page redirect through Google, so there's no chance to run
    // this page's own JS in between. Lands on /import instead, which now
    // does its own admin-only role check (see (app)/import/page.tsx) and
    // bounces a non-admin on to /review — one extra hop for this path
    // only, not a gap, since /import's guard is the same one that applies
    // regardless of how someone arrives there.
    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/import` },
    });
    if (error) setError(error.message);
  };

  return (
    <main className="mx-auto max-w-sm w-full p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin / Verifier Login</h1>
        <p className="text-sm text-gray-500">
          Accounts for this back-office are provisioned manually — there is no
          public signup.
        </p>
      </div>

      <form onSubmit={handlePasswordSignIn} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {GOOGLE_SSO_ENABLED && (
        <>
          <div className="relative text-center text-sm text-gray-500">
            <div className="absolute inset-x-0 top-1/2 border-t" />
            <span className="relative z-10 bg-white px-2 dark:bg-black">or</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full rounded border px-4 py-2"
          >
            Sign in with Google
          </button>
        </>
      )}

      {!GOOGLE_SSO_ENABLED && (
        <p className="text-center text-xs text-gray-400">
          Google sign-in isn&apos;t set up yet — use email/password for now.
        </p>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </main>
  );
}
