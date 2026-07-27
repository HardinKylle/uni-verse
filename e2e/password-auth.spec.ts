import { expect, test, type Page } from "@playwright/test";

import { createAdminClient, createConfirmedUser, deleteTestUser, randomUsername } from "./fixtures";

async function attemptSignup(page: Page, { password, confirmPassword }: { password: string; confirmPassword: string }) {
  await page.goto("/login");
  await page.getByRole("button", { name: "New here? Create an account" }).click();

  await page.getByRole("textbox", { name: "Email address" }).fill(`playwright-${crypto.randomUUID()}@example.com`);
  await page.getByRole("textbox", { name: "Username" }).fill(randomUsername());
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(password);
  await page.getByRole("textbox", { name: "Confirm password", exact: true }).fill(confirmPassword);
  await page.getByRole("button", { name: "Create account" }).click();
}

test("sign-up shows an inline error for a too-short password", async ({ page }) => {
  await attemptSignup(page, { password: "Abc123", confirmPassword: "Abc123" });

  await expect(page.getByText("Password must be at least 8 characters.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("sign-up shows an inline error for a password missing a character class", async ({ page }) => {
  await attemptSignup(page, { password: "alllowercase1", confirmPassword: "alllowercase1" });

  await expect(page.getByText("Password must include an uppercase letter.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("sign-up shows an inline error when the confirmation does not match", async ({ page }) => {
  await attemptSignup(page, { password: "Abcd1234", confirmPassword: "Abcd1235" });

  await expect(page.getByText("Passwords do not match.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("a confirmed password user can sign in through the UI", async ({ page }) => {
  const admin = createAdminClient();
  const { id, email, password } = await createConfirmedUser(admin);

  try {
    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email or username" }).fill(email);
    await page.getByRole("textbox", { name: "Password", exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/p\/[0-9a-f-]+$/);
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  } finally {
    await deleteTestUser(admin, id);
  }
});
