import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Browser-side Supabase client. Created lazily on first use so that merely
 * importing modules that reference it (e.g. in unit tests / demo mode) never
 * touches env vars or opens a connection.
 */
export function getSupabaseBrowserClient() {
  client ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}
