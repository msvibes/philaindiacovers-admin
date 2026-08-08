"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowserClient";

// Shared across every authenticated page (see src/app/(app)/layout.tsx) so
// there's one logout path, not one per page. signOut() calls Supabase
// Auth's own /auth/v1/logout endpoint — a real server-side session
// revocation, not just clearing the localStorage session client-side.
export function AppHeader() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabaseBrowser.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="flex items-center justify-between border-b px-8 py-4">
      <span className="font-semibold">PhilaIndiaCovers Admin</span>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded border px-3 py-1.5 text-sm"
      >
        Log out
      </button>
    </header>
  );
}
