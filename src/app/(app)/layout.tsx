import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";

// Wraps every authenticated page (/import, /review) with a shared header —
// a Next.js route group, so the URL is unaffected (still /import, /review),
// only the layout nesting changes. Not applied to /login (no session to
// log out of yet) or the scaffold root page.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
