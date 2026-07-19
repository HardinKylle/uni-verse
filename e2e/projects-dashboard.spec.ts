import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 900 } });
test.setTimeout(90_000);

function castNames(page: Page) {
  return page.getByRole("listitem").locator("strong");
}

async function waitForSaved(page: Page) {
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saving…", {
    timeout: 2000,
  });
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saved", {
    timeout: 5000,
  });
}

function preview(page: Page) {
  return page.getByRole("region", { name: "Message preview" });
}

test("a writer creates, renames, and switches between isolated projects", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]+$/);
  const firstProjectUrl = page.url();
  await expect(castNames(page)).toHaveText(["Jaz", "Kylle"]);
  await expect(page.getByRole("textbox", { name: "Message from Jaz" }).first()).toBeVisible();
  const studioNav = page.getByRole("navigation", { name: "Studio" });
  await expect(studioNav.getByText("Untitled Story", { exact: true })).toBeVisible();

  await studioNav.getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL("/dashboard");
  await expect(page.getByRole("heading", { name: "Untitled Story" })).toBeVisible();

  await page.getByRole("button", { name: "New story" }).click();
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]+$/);
  const secondProjectUrl = page.url();
  expect(secondProjectUrl).not.toBe(firstProjectUrl);
  await expect(castNames(page)).toHaveText(["Unnamed", "Unnamed"]);
  await expect(page.getByText("Jaz", { exact: true })).not.toBeVisible();
  await expect(page.getByText("Kylle", { exact: true })).not.toBeVisible();
  await expect(page.getByText("No messages yet")).toBeVisible();

  await page.getByRole("button", { name: "Edit" }).first().click();
  await page.getByLabel("Character name").fill("Nova");
  await waitForSaved(page);
  await page.getByRole("button", { name: "Edit" }).first().click();
  await page.getByRole("button", { name: "Edit" }).nth(1).click();
  await page.getByLabel("Character name").fill("Sol");
  await waitForSaved(page);
  await page.getByRole("textbox", { name: "New message" }).fill("second project only");
  await page.getByRole("button", { name: "Send message" }).click();
  await waitForSaved(page);

  await page.goto("/");
  await expect(page).toHaveURL("/dashboard");
  // Both stories are still called "Untitled Story"; the list sorts by most
  // recently touched, so the one just edited is first.
  const secondStoryCard = page.getByRole("article").first();
  await secondStoryCard.getByRole("button", { name: "Edit Untitled Story" }).click();
  await page.getByRole("textbox", { name: "Story title" }).fill("Second Story");
  await page.getByRole("textbox", { name: "Story description" }).fill("A tale of two casts");
  await page.getByRole("textbox", { name: "Story title" }).press("Enter");
  await expect(page.getByRole("heading", { name: "Second Story" })).toBeVisible();
  await expect(page.getByText("A tale of two casts")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Second Story" })).toBeVisible();
  await expect(page.getByText("A tale of two casts")).toBeVisible();

  await page.getByRole("heading", { name: "Untitled Story" }).click();
  await expect(page).toHaveURL(firstProjectUrl);
  await expect(castNames(page)).toHaveText(["Jaz", "Kylle"]);
  await expect(preview(page).getByText("second project only", { exact: true })).not.toBeVisible();
  await page.getByRole("textbox", { name: "New message" }).fill("first project only");
  await page.getByRole("button", { name: "Send message" }).click();
  await waitForSaved(page);

  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL("/dashboard");
  await page.getByRole("heading", { name: "Second Story" }).click();
  await expect(page).toHaveURL(secondProjectUrl);
  await expect(castNames(page)).toHaveText(["Nova", "Sol"]);
  await expect(preview(page).getByText("second project only", { exact: true })).toBeVisible();
  await expect(preview(page).getByText("first project only", { exact: true })).not.toBeVisible();

  await page.goto(firstProjectUrl);
  await expect(castNames(page)).toHaveText(["Jaz", "Kylle"]);
  await expect(preview(page).getByText("first project only", { exact: true })).toBeVisible();
  await expect(preview(page).getByText("second project only", { exact: true })).not.toBeVisible();
});

test("anonymous visitors still receive the demo studio at root", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Chat Script Timeline" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});
