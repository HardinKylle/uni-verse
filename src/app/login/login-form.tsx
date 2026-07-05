"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { confirmPasswordError, passwordError } from "./validate-credentials";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { focusRing, miniLabel, standardInput } from "../_components/studio/shared-ui";

type FormStatus = { kind: "error" | "success"; message: string } | null;
type Mode = "signin" | "signup";

export function LoginForm({ callbackError }: { callbackError?: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [status, setStatus] = useState<FormStatus>(
    callbackError ? { kind: "error", message: callbackError } : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const callbackUrl = () => `${window.location.origin}/auth/callback`;

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    if (mode === "signup") {
      const confirmPassword = String(form.get("confirmPassword") ?? "");
      const message = passwordError(password) ?? confirmPasswordError(password, confirmPassword);
      if (message) {
        setStatus({ kind: "error", message });
        return;
      }
    }

    setIsSubmitting(true);
    setStatus(null);

    if (mode === "signin") {
      const { error } = await getSupabaseBrowserClient().auth.signInWithPassword({ email, password });
      if (error) {
        setIsSubmitting(false);
        setStatus({ kind: "error", message: error.message });
        return;
      }
      window.location.assign("/");
      return;
    }

    const { data, error } = await getSupabaseBrowserClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl() },
    });

    if (error) {
      setIsSubmitting(false);
      setStatus({ kind: "error", message: error.message });
      return;
    }

    if (data.session) {
      window.location.assign("/");
      return;
    }

    setIsSubmitting(false);
    setStatus({ kind: "success", message: "Check your email to confirm your account." });
  }

  async function signInWithGoogle() {
    setIsSubmitting(true);
    setStatus(null);
    const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });

    if (error) {
      setIsSubmitting(false);
      setStatus({ kind: "error", message: error.message });
    }
  }

  function toggleMode() {
    setStatus(null);
    setMode((current) => (current === "signin" ? "signup" : "signin"));
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-sand-200/70 bg-white p-8 shadow-xl shadow-sand-900/5">
      <div className="mb-8">
        <p className={cn(miniLabel, "text-accent-600")}>Kathalis</p>
        <h1 className="font-display text-4xl text-sand-900">Keep your story close.</h1>
        <p className="mt-3 text-sm leading-6 text-sand-500">
          Sign in to save your episodes and continue writing across devices.
        </p>
      </div>

      {status ? (
        <p
          role={status.kind === "error" ? "alert" : "status"}
          className={cn(
            "mb-4 rounded-lg px-3 py-2.5 text-sm",
            status.kind === "error"
              ? "bg-accent-100 text-accent-800"
              : "bg-sand-100 text-sand-700",
          )}
        >
          {status.message}
        </p>
      ) : null}

      <form onSubmit={submitPassword} className="space-y-4">
        <label className="block">
          <span className={miniLabel}>Email address</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="writer@example.com"
            className={cn(standardInput, "border-sand-200 bg-sand-50 px-3 py-2.5 hover:bg-sand-50")}
          />
        </label>
        <div>
          <label className="block">
            <span className={miniLabel}>Password</span>
            <input
              name="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              placeholder="••••••••"
              className={cn(standardInput, "border-sand-200 bg-sand-50 px-3 py-2.5 hover:bg-sand-50")}
            />
          </label>
          {mode === "signup" ? (
            <span className="mt-1.5 block text-xs text-sand-400">
              At least 8 characters, with an uppercase letter, a lowercase letter, and a number.
            </span>
          ) : null}
        </div>
        {mode === "signup" ? (
          <label className="block">
            <span className={miniLabel}>Confirm password</span>
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              className={cn(standardInput, "border-sand-200 bg-sand-50 px-3 py-2.5 hover:bg-sand-50")}
            />
          </label>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:cursor-wait disabled:opacity-60",
            focusRing,
          )}
        >
          {isSubmitting
            ? mode === "signin" ? "Signing in…" : "Creating account…"
            : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        type="button"
        onClick={toggleMode}
        className={cn("mt-4 block w-full text-center text-xs text-sand-500 hover:text-sand-800", focusRing)}
      >
        {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>

      <div className="my-6 flex items-center gap-3 text-[10px] font-medium uppercase tracking-widest text-sand-400">
        <span className="h-px flex-1 bg-sand-200" />
        or
        <span className="h-px flex-1 bg-sand-200" />
      </div>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={signInWithGoogle}
        className={cn(
          "flex w-full items-center justify-center gap-3 rounded-lg border border-sand-200 bg-white px-4 py-2.5 text-sm font-medium text-sand-700 transition-colors hover:bg-sand-50 disabled:cursor-wait disabled:opacity-60",
          focusRing,
        )}
      >
        <span aria-hidden="true" className="font-bold text-[#4285f4]">G</span>
        Continue with Google
      </button>

      <Link href="/" className={cn("mt-6 block text-center text-xs text-sand-500 hover:text-sand-800", focusRing)}>
        Continue without signing in
      </Link>
    </div>
  );
}
