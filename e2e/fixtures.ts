import { test as base, type Page } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

import type { Database } from "../src/lib/supabase/database.types";

export function env(name: string) {
  if (process.env[name]) return process.env[name]!;
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(`${name}=`));
  if (!line) throw new Error(`${name} is required for authenticated e2e tests`);
  return line.slice(name.length + 1).replace(/^['"]|['"]$/g, "");
}

export function createAdminClient() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function randomUsername() {
  return `pw_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export async function createConfirmedUser(
  admin: ReturnType<typeof createAdminClient>,
  options: { username?: string | null } = {},
) {
  const email = `playwright-${crypto.randomUUID()}@example.com`;
  const password = `Test-${crypto.randomUUID()}!`;
  const username = options.username === null ? null : options.username ?? randomUsername();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error) throw error;
  return { id: data.user.id, email, password, username };
}

/**
 * Deletes a test user *and* anything they uploaded to the avatars bucket.
 *
 * Storage objects don't cascade when the owning auth user is removed, so a
 * bare `deleteUser` leaves every uploaded avatar behind under a folder whose
 * owner no longer exists — indistinguishable, later, from a real upload the
 * developer had replaced. Always prefer this over `admin.auth.admin.deleteUser`
 * in teardown.
 */
export async function deleteTestUser(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: objects, error: listError } = await admin.storage.from("avatars").list(userId, { limit: 1000 });
  // Teardown must never mask a test's own failure, so storage problems are
  // reported and swallowed rather than thrown.
  if (listError) {
    console.warn(`avatar cleanup: could not list ${userId}: ${listError.message}`);
  } else if (objects.length > 0) {
    const paths = objects.filter((object) => object.id).map((object) => `${userId}/${object.name}`);
    if (paths.length > 0) {
      const { error: removeError } = await admin.storage.from("avatars").remove(paths);
      if (removeError) console.warn(`avatar cleanup: could not remove ${userId}: ${removeError.message}`);
    }
  }

  await admin.auth.admin.deleteUser(userId);
}

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ context }, runTest) => {
    const url = env("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const admin = createAdminClient();
    const created = await createConfirmedUser(admin);
    const { email, password } = created;

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
      await deleteTestUser(admin, created.id);
    }
  },
});

export { expect } from "@playwright/test";
