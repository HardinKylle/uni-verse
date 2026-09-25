import type { NextRequest } from "next/server";

import { completeAuthRedirect } from "@/lib/supabase/complete-auth-redirect";

/**
 * Password-reset links land here rather than on /auth/callback, so the
 * destination is fixed by the route itself: whichever link shape the email
 * template produced, the user always ends up choosing a new password instead
 * of being signed straight into the workspace.
 */
export async function GET(request: NextRequest) {
  return completeAuthRedirect(request, "/reset-password");
}
