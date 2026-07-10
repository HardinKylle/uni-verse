"use server";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeUsername, usernameError } from "./validate-username";

// Matches Supabase's own message for a failed email+password attempt, so a
// bad username, an unknown username, and a right-username-wrong-password all
// look identical — a username is never confirmed to exist via this error.
const GENERIC_SIGN_IN_ERROR = "Invalid login credentials";
const POSTGRES_UNIQUE_VIOLATION = "23505";

function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** Public existence check used to give inline feedback during sign-up. */
export async function isUsernameTaken(rawUsername: string): Promise<boolean> {
  const username = normalizeUsername(rawUsername);
  if (usernameError(username)) return false;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

/**
 * Resolves a username to its account's email server-side, then signs in on
 * the cookie-bound client so the session is set. The resolved email is never
 * sent back to the browser.
 */
export async function signInWithUsername(
  rawUsername: string,
  password: string,
): Promise<{ error?: string }> {
  const username = normalizeUsername(rawUsername);
  if (usernameError(username)) return { error: GENERIC_SIGN_IN_ERROR };

  const admin = createAdminClient();
  const profile = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (profile.error) throw profile.error;
  if (!profile.data) return { error: GENERIC_SIGN_IN_ERROR };

  const user = await admin.auth.admin.getUserById(profile.data.id);
  const email = user.data.user?.email;
  if (user.error || !email) return { error: GENERIC_SIGN_IN_ERROR };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: GENERIC_SIGN_IN_ERROR };

  return {};
}

/** Claims a username for the caller's own (already-existing) profile row. */
export async function claimUsername(rawUsername: string): Promise<{ error?: string }> {
  const username = normalizeUsername(rawUsername);
  const formatError = usernameError(username);
  if (formatError) return { error: formatError };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again to continue." };

  const existing = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.username) return { error: "Your account already has a username." };

  const { error } = await supabase.from("profiles").upsert({ id: user.id, username });
  if (error) {
    if (error.code === POSTGRES_UNIQUE_VIOLATION) {
      return { error: "That username is already taken." };
    }
    return { error: "Something went wrong. Try again." };
  }

  return {};
}
