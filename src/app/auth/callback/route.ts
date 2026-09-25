import type { NextRequest } from "next/server";

import { completeAuthRedirect } from "@/lib/supabase/complete-auth-redirect";

export async function GET(request: NextRequest) {
  // Reset emails normally target /auth/recovery; this catches any that still
  // point here so a recovery link never signs someone straight into the app.
  const isRecovery = request.nextUrl.searchParams.get("type") === "recovery";
  return completeAuthRedirect(request, isRecovery ? "/reset-password" : "/");
}
