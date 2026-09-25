"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";

import { isUsernameTaken, signInWithUsername } from "./actions";
import { confirmPasswordError, passwordError } from "./validate-credentials";
import { normalizeUsername, usernameError } from "./validate-username";
import { PasswordInput } from "./password-input";
import { TextInput } from "./text-input";
import { focusRing } from "@/components/ui/form-styles";
import { BrandLogo } from "@/components/brand-logo";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type FormStatus = { kind: "error" | "success"; message: string } | null;
type Mode = "signin" | "signup" | "forgot";

// Same message whether or not the address has an account, so the form never
// confirms which emails are registered.
const SUBMIT_LABEL: Record<Mode, string> = {
  signin: "Sign in",
  signup: "Create account",
  forgot: "Send reset link",
};
const SUBMITTING_LABEL: Record<Mode, string> = {
  signin: "Signing in…",
  signup: "Creating account…",
  forgot: "Sending…",
};

const RESET_SENT_MESSAGE = "If an account uses that email, we sent a link to reset your password.";

export function LoginForm({ callbackError }: { callbackError?: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [status, setStatus] = useState<FormStatus>(
    callbackError ? { kind: "error", message: callbackError } : null,
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBusy = !isHydrated || isSubmitting;

  useEffect(() => {
    const timer = setTimeout(() => setIsHydrated(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const callbackUrl = () => `${window.location.origin}/auth/callback`;

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    if (mode === "forgot") {
      const email = String(form.get("email") ?? "").trim();
      setIsSubmitting(true);
      setStatus(null);
      const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email, {
        redirectTo: callbackUrl(),
      });
      setIsSubmitting(false);
      // Only rate limiting surfaces as an error here; Supabase reports success
      // for unknown addresses too.
      setStatus(error ? { kind: "error", message: error.message } : { kind: "success", message: RESET_SENT_MESSAGE });
      return;
    }

    const password = String(form.get("password") ?? "");

    if (mode === "signin") {
      const identifier = String(form.get("identifier") ?? "");

      setIsSubmitting(true);
      setStatus(null);

      // A leading "@" can't start an email address, so "@jaz" is unambiguously a
      // username typed the social-handle way — route it like plain "jaz".
      const isEmail = identifier.includes("@") && !identifier.startsWith("@");
      const errorMessage = isEmail
        ? (await getSupabaseBrowserClient().auth.signInWithPassword({ email: identifier, password })).error
            ?.message
        : (await signInWithUsername(identifier, password)).error;
      if (errorMessage) {
        setIsSubmitting(false);
        setStatus({ kind: "error", message: errorMessage });
        return;
      }
      window.location.assign("/");
      return;
    }

    const email = String(form.get("email") ?? "");
    const username = normalizeUsername(String(form.get("username") ?? ""));
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    const message =
      usernameError(username) ??
      passwordError(password) ??
      confirmPasswordError(password, confirmPassword);
    if (message) {
      setStatus({ kind: "error", message });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    if (await isUsernameTaken(username)) {
      setIsSubmitting(false);
      setStatus({ kind: "error", message: "That username is already taken." });
      return;
    }

    const { data, error } = await getSupabaseBrowserClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl(), data: { username } },
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

  function switchMode(next: Mode) {
    setStatus(null);
    setMode(next);
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-sand-200/70 bg-white p-8 shadow-xl shadow-sand-900/5">
      <div className="mb-8">
        <div className="mb-4"><BrandLogo /></div>
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
        {mode === "forgot" ? (
          <TextInput
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="writer@example.com"
          />
        ) : mode === "signin" ? (
          <TextInput
            label="Email or username"
            name="identifier"
            autoComplete="username"
            placeholder="writer@example.com or writer"
          />
        ) : (
          <>
            <TextInput
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="writer@example.com"
            />
            <div>
              <TextInput label="Username" name="username" autoComplete="username" placeholder="writer" />
              <span className="mt-1.5 block text-xs text-sand-400">
                3–20 characters: lowercase letters, numbers, and underscores. Shown instead of your email.
              </span>
            </div>
          </>
        )}
        {mode === "forgot" ? null : <div>
          <PasswordInput
            label="Password"
            name="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
          {mode === "signin" ? (
            <button
              type="button"
              className={cn("mt-1.5 block text-xs text-sand-500 hover:text-sand-800", focusRing)}
              onClick={() => switchMode("forgot")}
            >
              Forgot password?
            </button>
          ) : null}
          {mode === "signup" ? (
            <span className="mt-1.5 block text-xs text-sand-400">
              At least 8 characters, with an uppercase letter, a lowercase letter, and a number.
            </span>
          ) : null}
        </div>}
        {mode === "signup" ? (
          <PasswordInput label="Confirm password" name="confirmPassword" autoComplete="new-password" />
        ) : null}
        <Button type="submit" variant="primary" fullWidth isDisabled={isBusy}>
          {isSubmitting ? SUBMITTING_LABEL[mode] : SUBMIT_LABEL[mode]}
        </Button>
      </form>

      <div className="mt-4">
        {mode === "forgot" ? (
          <Button variant="ghost" size="sm" fullWidth onPress={() => switchMode("signin")}>
            Back to sign in
          </Button>
        ) : (
          <Button variant="ghost" size="sm" fullWidth onPress={toggleMode}>
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </Button>
        )}
      </div>

      <div className="my-6 flex items-center gap-3 text-[10px] font-medium uppercase tracking-widest text-sand-400">
        <span className="h-px flex-1 bg-sand-200" />
        or
        <span className="h-px flex-1 bg-sand-200" />
      </div>

      <Button variant="outline" fullWidth isDisabled={isBusy} onPress={signInWithGoogle}>
        <span aria-hidden="true" className="font-bold text-[#4285f4]">G</span>
        Continue with Google
      </Button>

      <Link href="/" className={cn("mt-6 block text-center text-xs text-sand-500 hover:text-sand-800", focusRing)}>
        Continue without signing in
      </Link>
    </div>
  );
}
