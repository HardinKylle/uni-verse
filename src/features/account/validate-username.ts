// Mirrors the check constraint in supabase/migrations/20260706000001_username.sql -
// keep both in sync.
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export const RESERVED_USERNAMES = ["admin", "kathalis", "api", "login", "auth", "settings"] as const;

/** Trims, drops a leading "@", and lowercases, so "@Jaz " claims/matches "jaz". */
export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@/, "").toLowerCase();
}

export function usernameError(username: string): string | null {
  if (!USERNAME_PATTERN.test(username)) {
    return "Usernames are 3–20 characters, using lowercase letters, numbers, and underscores.";
  }
  if ((RESERVED_USERNAMES as readonly string[]).includes(username)) {
    return "That username is reserved.";
  }
  return null;
}
