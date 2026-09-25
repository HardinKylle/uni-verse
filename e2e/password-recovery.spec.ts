import { createAdminClient, createConfirmedUser, deleteTestUser, expect, test } from "./fixtures";

test("forgot password sends a reset link without confirming the account exists", async ({ page }) => {
  // The project-wide auth email cap is a few per hour, so never send a real one.
  let requestedEmail: string | undefined;
  await page.route("**/auth/v1/recover**", async (route) => {
    requestedEmail = route.request().postDataJSON()?.email;
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/login");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("nobody@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(page.getByRole("status")).toHaveText(
    "If an account uses that email, we sent a link to reset your password.",
  );
  expect(requestedEmail).toBe("nobody@example.com");

  await page.getByRole("button", { name: "Back to sign in" }).click();
  await expect(page.getByRole("textbox", { name: "Email or username" })).toBeVisible();
});

test("a reset link lets the user set a new password and sign in with it", async ({ page, browser }) => {
  const admin = createAdminClient();
  const { id, email } = await createConfirmedUser(admin);
  const newPassword = `Reset-${crypto.randomUUID()}1a`;

  try {
    const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
    if (error) throw error;

    await page.goto(`/auth/callback?token_hash=${data.properties.hashed_token}&type=recovery`);
    await expect(page).toHaveURL("/reset-password");

    await page.getByRole("textbox", { name: "New password", exact: true }).fill(newPassword);
    await page.getByRole("textbox", { name: "Confirm new password", exact: true }).fill("Mismatch1a");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText("Passwords do not match.")).toBeVisible();

    await page.getByRole("textbox", { name: "Confirm new password", exact: true }).fill(newPassword);
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page).toHaveURL(/\/p\/[0-9a-f-]+$/);

    // A separate context has none of the recovery session's cookies, so this
    // proves the new password itself works.
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();
    await freshPage.goto("/login");
    await freshPage.getByRole("textbox", { name: "Email or username" }).fill(email);
    await freshPage.getByRole("textbox", { name: "Password", exact: true }).fill(newPassword);
    await freshPage.getByRole("button", { name: "Sign in" }).click();
    // The recovery sign-in already created their first story, so this is a returning user.
    await expect(freshPage).toHaveURL("/dashboard");
    await freshContext.close();
  } finally {
    await deleteTestUser(admin, id);
  }
});

test("the reset page sends visitors without a recovery session back to sign in", async ({ page }) => {
  await page.goto("/reset-password");

  await expect(page).toHaveURL(/\/login\?error=/);
  await expect(
    page.getByText("Your reset link expired or was already used. Request a new one."),
  ).toBeVisible();
});
