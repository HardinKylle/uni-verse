import type { EmailOtpType } from "@supabase/supabase-js";
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

  let error: Error | null = null;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type && otpTypes.includes(type)) {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  } else {
    error = new Error("The sign-in link is missing or invalid.");
  }

  if (error) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "We could not complete sign-in. Please request a new link.");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL("/", origin));
}
