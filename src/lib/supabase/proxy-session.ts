import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refreshes the Supabase auth session cookies on every matched request.
 *
 * Deliberately does NOT redirect unauthenticated visitors: anonymous users get
 * the in-memory demo studio (try-before-signup), so there is no login wall.
 * The authoritative auth check lives in the server components that load data.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Triggers a token refresh when the access token has expired; the refreshed
  // cookies are written onto the response via setAll above.
  await supabase.auth.getUser();

  return response;
}
