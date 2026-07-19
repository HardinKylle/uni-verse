import type { Page } from "@playwright/test";

import { createAdminClient, createConfirmedUser, expect, test } from "./fixtures";

function trackNavigationFailures(page: Page) {
  const navigations: string[] = [];
  const errors: string[] = [];

  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  return { navigations, errors };
}

test("authenticated Firefox remains settled across project navigation", async ({
  authenticatedPage: page,
}) => {
  const { navigations, errors } = trackNavigationFailures(page);

  await page.goto("/", { waitUntil: "commit" });
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]+$/);
  await page.waitForTimeout(2000);

  expect(navigations.length).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);

  navigations.length = 0;
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL("/dashboard");
  await page.waitForTimeout(2000);

  expect(navigations.length).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});

test("Firefox remains settled after signing in through the login form", async ({ page }) => {
  const admin = createAdminClient();
  const created = await createConfirmedUser(admin);
  const { navigations, errors } = trackNavigationFailures(page);

  try {
    const project = await admin
      .from("projects")
      .insert({ owner_id: created.id, title: "Existing story", description: "" });
    if (project.error) throw project.error;

    await page.goto("/login");
    await page.getByLabel("Email or username").fill(created.email);
    await page.getByRole("textbox", { name: "Password", exact: true }).fill(created.password);

    navigations.length = 0;
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/dashboard");
    await page.waitForTimeout(2000);

    const diagnostic = JSON.stringify({ navigations, errors }, null, 2);
    expect(errors, diagnostic).toEqual([]);
    expect(navigations, diagnostic).toHaveLength(2);
  } finally {
    await admin.auth.admin.deleteUser(created.id);
  }
});
