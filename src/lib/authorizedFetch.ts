import { supabaseBrowser } from "./supabaseBrowserClient";

// Attaches the current session's access token as a bearer header, so
// server-side routes can verify the caller via requireRole() instead of
// the request being unauthenticated (T-06.5).
export async function authorizedFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const { data } = await supabaseBrowser.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, { ...init, headers });
}
