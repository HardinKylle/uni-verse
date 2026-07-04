import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · AU Studio" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F3EF] px-6 py-12">
      <LoginForm callbackError={error} />
    </main>
  );
}
