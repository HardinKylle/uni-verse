import { expect, test } from "./fixtures";

test("login page offers email + password and Google sign-in, and switches to sign-up", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Keep your story close." })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email or username" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Password", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();

  await page.getByRole("button", { name: "New here? Create an account" }).click();
  await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Already have an account? Sign in" })).toBeVisible();
});

test("auth callback failures return to login with an error", async ({ page }) => {
  await page.goto("/auth/callback");

  await expect(page).toHaveURL(/\/login\?error=/);
  await expect(page.getByText("We could not complete sign-in. Please request a new link.")).toBeVisible();
});

test("visiting /login while signed in redirects to the workspace", async ({ authenticatedPage }) => {
  await authenticatedPage.goto("/login");

  await expect(authenticatedPage).toHaveURL(/\/p\/[0-9a-f-]+$/);
});
