import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "./database.types";

/** Server-side Supabase client bound to the request's auth cookies. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll from a Server Component is a no-op; the proxy refreshes
            // sessions, so failing to write here is safe to ignore.
          }
        },
      },
    },
  );
}
