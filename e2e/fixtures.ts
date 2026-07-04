import { test as base, type Page } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

import type { Database } from "../src/lib/supabase/database.types";

function env(name: string) {
  if (process.env[name]) return process.env[name]!;
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(`${name}=`));
  if (!line) throw new Error(`${name} is required for authenticated e2e tests`);
  return line.slice(name.length + 1).replace(/^['"]|['"]$/g, "");
}

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ context }, runTest) => {
    const url = env("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient<Database>(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const email = `playwright-${crypto.randomUUID()}@example.com`;
    const password = `Test-${crypto.randomUUID()}!`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) throw createError;

    const cookies: Array<{ name: string; value: string }> = [];
    const auth = createServerClient<Database>(url, anonKey, {
      cookies: {
        getAll: () => cookies,
        setAll: (nextCookies) => {
          cookies.splice(0, cookies.length, ...nextCookies.map(({ name, value }) => ({ name, value })));
        },
      },
    });

    try {
      const { error: signInError } = await auth.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      await context.addCookies(cookies.map(({ name, value }) => ({
        name,
        value,
        url: "http://localhost:3000",
        httpOnly: false,
        secure: false,
        sameSite: "Lax" as const,
      })));
      const page = await context.newPage();
      await runTest(page);
      await page.close();
    } finally {
      await admin.auth.admin.deleteUser(created.user.id);
    }
  },
});

export { expect } from "@playwright/test";
