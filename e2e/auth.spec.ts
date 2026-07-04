import { expect, test } from "@playwright/test";

test("login page offers email and Google sign-in", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Keep your story close." })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email address" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Email me a magic link" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

test("auth callback failures return to login with an error", async ({ page }) => {
  await page.goto("/auth/callback");

  await expect(page).toHaveURL(/\/login\?error=/);
  await expect(page.getByText("We could not complete sign-in. Please request a new link.")).toBeVisible();
});
