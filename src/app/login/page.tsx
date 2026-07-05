import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign in · AU Studio" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F3EF] px-6 py-12">
      <LoginForm callbackError={error} />
    </main>
  );
}
