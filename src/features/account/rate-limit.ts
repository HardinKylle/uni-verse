import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export type AuthRequestScope = "username-lookup" | "username-signin";

export const AUTH_RATE_LIMIT_MESSAGE = "Please wait a minute and try again.";

/** Vercel overwrites this header. Other hosts share a bucket rather than trust client headers. */
function requestAddress(requestHeaders: Headers): string {
  if (process.env.VERCEL !== "1") return "shared";
  const address = requestHeaders.get("x-forwarded-for")?.split(",")[0].trim();
  return address && isIP(address) ? address.toLowerCase() : "shared";
}

export async function limitAuthRequests(
  admin: SupabaseClient<Database>,
  scope: AuthRequestScope,
  username: string,
  requestHeaders: Headers,
): Promise<boolean> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return false;

  const key = (subject: string) => createHmac("sha256", secret)
    .update(`kathalis-auth-v1:${scope}:${subject}`)
    .digest("hex");

  async function consume(subject: string, limit: number): Promise<boolean> {
    const { data, error } = await admin.rpc("consume_auth_rate_limit", {
      p_key: key(subject),
      p_limit: limit,
      p_window_seconds: 60,
    });
    return !error && data === true;
  }

  try {
    if (!await consume(`ip:${requestAddress(requestHeaders)}`, scope === "username-lookup" ? 60 : 20)) {
      return false;
    }
    return scope === "username-lookup" || await consume(`account:${username}`, 10);
  } catch {
    // A missing migration or unavailable limiter must not permit unrestricted admin lookups.
    return false;
  }
}
