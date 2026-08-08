"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowserClient";

// Google's OAuth Client ID/Secret aren't configured in the Supabase
// dashboard yet (a dashboard-side prerequisite, not something this code
// can satisfy — see API-Integration-Contracts.md's Route Handler
// authentication section and PROGRESS.md). Confirmed live: without it,
// clicking through navigates the browser away to Supabase's own domain and
// shows a raw {"error_code":"validation_failed",...} JSON response — not a
// clean in-app error. Flip this to true once that dashboard setup is done;
// the signInWithOAuth call below is otherwise already correct.
const GOOGLE_SSO_ENABLED = false;

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

    setIsSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/import");
  };

  const handleGoogleSignIn = async () => {
    setError(null);
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
