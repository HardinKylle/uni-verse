import { createAdminClient, tryEnv } from "./fixtures";

/**
 * Fail the whole e2e run fast — before any spec, browser, or web server spins
 * up — when the Supabase environment the authenticated specs depend on isn't
 * usable. Roughly a third of the suite (auth, persistence, cast sync, episode
 * switching, cross-user isolation) talks to the real dev Supabase project; a
 * missing key or an unreachable project otherwise surfaces as a wall of opaque
 * per-test failures deep into the run.
 */

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export default async function globalSetup() {
  const missing = REQUIRED_ENV.filter((name) => !tryEnv(name));
  if (missing.length > 0) {
    throw new Error(
      `e2e setup: missing Supabase environment ${missing.join(", ")}.\n` +
        "The authenticated specs run against the dev Supabase project. Set these in\n" +
        ".env.local (or the shell env) before running `npm run test:e2e`:\n" +
        REQUIRED_ENV.map((name) => `  - ${name}`).join("\n") +
        "\nThe URL and anon/service-role keys are in the dev project's Supabase dashboard\n" +
        "under Project Settings → API. This repo's Supabase link is dev-only — never point\n" +
        "it at a production project.",
    );
  }

  // Reachability + key validity: a lightweight admin call that exercises the
  // same URL and service-role key the fixtures use. A bad key, a paused/deleted
  // project, or no network all fail here with one clear message.
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw error;
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(
      `e2e setup: could not reach the dev Supabase project (${detail}).\n` +
        "Check that NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY point at a\n" +
        "live dev project and that you have network access to it.",
    );
  }
}
