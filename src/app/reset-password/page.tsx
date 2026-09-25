import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/features/account/reset-password-form";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Reset password · Kathalis" };

const EXPIRED_RESET_LINK_ERROR = "Your reset link expired or was already used. Request a new one.";

export default async function ResetPasswordPage() {
  // The recovery link's callback is what creates this session; without one the
  // link was expired, reused, or never followed.
  const user = await getCurrentUser();
  if (!user) redirect(`/login?error=${encodeURIComponent(EXPIRED_RESET_LINK_ERROR)}`);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F3EF] px-6 py-12">
      <ResetPasswordForm />
    </main>
  );
}
