import { isAuthError, type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const otpTypes: EmailOtpType[] = [
  "email",
  "magiclink",
  "signup",
  "recovery",
  "invite",
  "email_change",
];

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const supabase = await createSupabaseServerClient();

  let flow: "pkce" | "token_hash" | "invalid_request";
  let error: Error | null = null;
  if (code) {
    flow = "pkce";
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type && otpTypes.includes(type)) {
    flow = "token_hash";
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  } else {
    flow = "invalid_request";
    error = new Error("The sign-in link is missing or invalid.");
  }

  if (error) {
    const authError = isAuthError(error) ? error : null;
    console.error("Auth callback failed", {
      flow,
      code: authError?.code,
      status: authError?.status,
      message: error.message,
    });

    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "We could not complete sign-in. Please request a new link.");
    return NextResponse.redirect(loginUrl);
  }

  // A recovery link signs the user in only so they can choose a new password.
  const destination = flow === "token_hash" && type === "recovery" ? "/reset-password" : "/";
  return NextResponse.redirect(new URL(destination, origin));
}
