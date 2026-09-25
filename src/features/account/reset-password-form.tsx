"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@heroui/react";

import { confirmPasswordError, passwordError } from "./validate-credentials";
import { PasswordInput } from "./password-input";
import { BrandLogo } from "@/components/brand-logo";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsHydrated(true), 0);
    return () => clearTimeout(timer);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    const message = passwordError(password) ?? confirmPasswordError(password, confirmPassword);
    if (message) {
      setError(message);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { error: updateError } = await getSupabaseBrowserClient().auth.updateUser({ password });
    if (updateError) {
      setIsSubmitting(false);
      setError(updateError.message);
      return;
    }

    // The recovery session is a normal session, so the user is already signed in.
    // Full load (not router.push) so server components read the fresh auth cookies.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-sand-200/70 bg-white p-8 shadow-xl shadow-sand-900/5">
      <div className="mb-8">
        <div className="mb-4"><BrandLogo /></div>
        <h1 className="font-display text-4xl text-sand-900">Choose a new password.</h1>
        <p className="mt-3 text-sm leading-6 text-sand-500">
          You&apos;ll stay signed in on this device after saving it.
        </p>
      </div>

      {error ? (
        <p role="alert" className="mb-4 rounded-lg bg-accent-100 px-3 py-2.5 text-sm text-accent-800">
          {error}
        </p>
      ) : null}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <PasswordInput label="New password" name="password" autoComplete="new-password" />
          <span className="mt-1.5 block text-xs text-sand-400">
            At least 8 characters, with an uppercase letter, a lowercase letter, and a number.
          </span>
        </div>
        <PasswordInput label="Confirm new password" name="confirmPassword" autoComplete="new-password" />
        <Button type="submit" variant="primary" fullWidth isDisabled={!isHydrated || isSubmitting}>
          {isSubmitting ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </div>
  );
}
