"use client";

import { useEffect, useState, type FormEvent } from "react";

import { claimUsername } from "./actions";
import { normalizeUsername, usernameError } from "./validate-username";
import { focusRing, miniLabel, standardInput } from "@/components/ui/form-styles";
import { cn } from "@/lib/utils";

export function ClaimUsernameForm() {
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
    const username = normalizeUsername(String(form.get("username") ?? ""));

    const formatError = usernameError(username);
    if (formatError) {
      setError(formatError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await claimUsername(username);
    if (result.error) {
      setIsSubmitting(false);
      setError(result.error);
      return;
    }

    window.location.assign("/");
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-sand-200/70 bg-white p-8 shadow-xl shadow-sand-900/5">
      <div className="mb-8">
        <p className={cn(miniLabel, "text-accent-600")}>Kathalis</p>
        <h1 className="font-display text-4xl text-sand-900">Choose your username.</h1>
        <p className="mt-3 text-sm leading-6 text-sand-500">
          Your username is your handle on Kathalis — it&apos;s shown instead of your email and won&apos;t
          be asked for again.
        </p>
      </div>

      {error ? (
        <p role="alert" className="mb-4 rounded-lg bg-accent-100 px-3 py-2.5 text-sm text-accent-800">
          {error}
        </p>
      ) : null}

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className={miniLabel}>Username</span>
          <input
            name="username"
            type="text"
            autoComplete="username"
            required
            placeholder="writer"
            className={cn(standardInput, "border-sand-200 bg-sand-50 px-3 py-2.5 hover:bg-sand-50")}
          />
        </label>
        <span className="block text-xs text-sand-400">
          3–20 characters: lowercase letters, numbers, and underscores.
        </span>
        <button
          type="submit"
          disabled={!isHydrated || isSubmitting}
          className={cn(
            "w-full rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:cursor-wait disabled:opacity-60",
            focusRing,
          )}
        >
          {isSubmitting ? "Claiming…" : "Claim username"}
        </button>
      </form>

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className={cn("mt-4 block w-full text-center text-xs text-sand-500 hover:text-sand-800", focusRing)}
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
