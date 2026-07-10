import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "../src/lib/supabase/database.types";
import { createAdminClient, createConfirmedUser, env, expect, randomUsername, test } from "./fixtures";

test("sign-up rejects an invalid or reserved username inline", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "New here? Create an account" }).click();

  await page.getByRole("textbox", { name: "Email address" }).fill(`playwright-${crypto.randomUUID()}@example.com`);
  await page.getByRole("textbox", { name: "Username" }).fill("ab");
  await page.getByLabel("Password", { exact: true }).fill("Abcd1234");
  await page.getByLabel("Confirm password").fill("Abcd1234");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(
    page.getByText("Usernames are 3–20 characters, using lowercase letters, numbers, and underscores."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await page.getByRole("textbox", { name: "Username" }).fill("admin");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("That username is reserved.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("a user can sign in with their email or their username", async ({ page }) => {
  const admin = createAdminClient();
  const { id, email, password, username } = await createConfirmedUser(admin);

  try {
    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email or username" }).fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText(`Signed in as @${username}`)).toBeVisible();
    await expect(page.getByText(email)).not.toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email or username" }).fill(username!);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText(`Signed in as @${username}`)).toBeVisible();
  } finally {
    await admin.auth.admin.deleteUser(id);
  }
});

test("a legacy account without a username is prompted once, and a taken name shows an inline error", async ({
  page,
}) => {
  const admin = createAdminClient();
  const holder = await createConfirmedUser(admin);
  const legacy = await createConfirmedUser(admin, { username: null });

  try {
    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email or username" }).fill(legacy.email);
    await page.getByLabel("Password").fill(legacy.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("heading", { name: "Choose your username." })).toBeVisible();

    await page.getByRole("textbox", { name: "Username" }).fill(holder.username!);
    await page.getByRole("button", { name: "Claim username" }).click();
    await expect(page.getByText("That username is already taken.")).toBeVisible();

    const freshUsername = randomUsername();
    await page.getByRole("textbox", { name: "Username" }).fill(freshUsername);
    await page.getByRole("button", { name: "Claim username" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText(`Signed in as @${freshUsername}`)).toBeVisible();

    await page.reload();
    await expect(page.getByText(`Signed in as @${freshUsername}`)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Choose your username." })).not.toBeVisible();
  } finally {
    await admin.auth.admin.deleteUser(holder.id);
    await admin.auth.admin.deleteUser(legacy.id);
  }
});

test("signing in with an unknown username fails with the same generic error as a bad password", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email or username" }).fill(`nobody_${crypto.randomUUID().slice(0, 8)}`);
  await page.getByLabel("Password").fill("whatever-Password1");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Invalid login credentials")).toBeVisible();
});

test("RLS lets a user read and update only their own profile", async () => {
  const admin = createAdminClient();
  const alice = await createConfirmedUser(admin);
  const bob = await createConfirmedUser(admin);

  try {
    const url = env("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const cookies: Array<{ name: string; value: string }> = [];
    const asAlice = createBrowserClient<Database>(url, anonKey, {
      cookies: {
        getAll: () => cookies,
        setAll: (next) => {
          cookies.splice(0, cookies.length, ...next);
        },
      },
    });

    const { error: signInError } = await asAlice.auth.signInWithPassword({
      email: alice.email,
      password: alice.password,
    });
    if (signInError) throw signInError;

    const ownProfile = await asAlice.from("profiles").select("username").eq("id", alice.id).maybeSingle();
    expect(ownProfile.data?.username).toBe(alice.username);

    const bobsProfile = await asAlice.from("profiles").select("username").eq("id", bob.id).maybeSingle();
    expect(bobsProfile.data).toBeNull();

    const update = await asAlice.from("profiles").update({ username: "hijacked" }).eq("id", bob.id).select();
    expect(update.data).toEqual([]);

    const bobCheck = await admin.from("profiles").select("username").eq("id", bob.id).maybeSingle();
    expect(bobCheck.data?.username).toBe(bob.username);
  } finally {
    await admin.auth.admin.deleteUser(alice.id);
    await admin.auth.admin.deleteUser(bob.id);
  }
});
