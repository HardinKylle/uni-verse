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

// The individual password rules are unit-tested in validate-credentials.test.ts;
// this only proves the form wires validation errors inline and stays put.
test("sign-up shows password validation errors inline", async ({ page }) => {
  await attemptSignup(page, { password: "Abc123", confirmPassword: "Abc123" });
  await expect(page.getByText("Password must be at least 8 characters.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await page.getByRole("textbox", { name: "Password", exact: true }).fill("Abcd1234");
  await page.getByRole("textbox", { name: "Confirm password", exact: true }).fill("Abcd1235");
  await page.getByRole("button", { name: "Create account" }).click();
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
