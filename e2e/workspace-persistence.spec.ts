import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 900 } });
test.setTimeout(60_000);
test.describe.configure({ mode: "serial" });

async function waitForStudioHydration(page: Page) {
  await page.getByRole("button", { name: "Close properties" }).click();
  await expect(page.getByRole("button", { name: "Open properties" })).toBeVisible();
  await page.getByRole("button", { name: "Open properties" }).click();
  await expect(page.getByRole("button", { name: "Close properties" })).toBeVisible();
}

test("signed-in edits autosave and survive reload without transient writes", async ({ authenticatedPage: page }) => {
  let episodeWrites = 0;
  page.on("request", (request) => {
    if (request.method() === "PATCH" && request.url().includes("/rest/v1/episodes")) episodeWrites += 1;
  });

  await page.goto("/");
  await expect(page.getByText(/Signed in as/)).toBeVisible();
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saved");
  await waitForStudioHydration(page);

  const firstMessage = page.getByRole("textbox", { name: "Message from Jaz" }).first();
  await firstMessage.fill("persisted from Playwright");
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saving…", { timeout: 2000 });
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saved", { timeout: 5000 });
  expect(episodeWrites).toBe(1);

  const writesAfterContentEdit = episodeWrites;
  await page.getByRole("textbox", { name: "New message" }).fill("draft only");
  await page.getByRole("button", { name: "Close properties" }).click();
  await page.waitForTimeout(1100);
  expect(episodeWrites).toBe(writesAfterContentEdit);

  await page.reload();
  await expect(page.getByRole("textbox", { name: "Message from Jaz" }).first())
    .toHaveValue("persisted from Playwright");
  await expect(page.getByRole("textbox", { name: "New message" })).toHaveValue("");
});

test("autosave retries a transient failure", async ({ authenticatedPage: page }) => {
  let failedOnce = false;
  await page.route("**/rest/v1/episodes**", async (route) => {
    if (route.request().method() === "PATCH" && !failedOnce) {
      failedOnce = true;
      await route.abort("failed");
      return;
    }
    await route.continue();
  });

  await page.goto("/");
  await waitForStudioHydration(page);
  await page.getByRole("textbox", { name: "Message from Jaz" }).first().fill("retry this edit");
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Retrying…", { timeout: 3000 });
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saved", { timeout: 5000 });
});

test("an edit made during an in-flight save uses the returned revision", async ({ authenticatedPage: page }) => {
  let releaseFirstSave: (() => void) | undefined;
  const firstSaveStarted = new Promise<void>((resolve) => {
    releaseFirstSave = resolve;
  });
  let delayed = false;
  await page.route("**/rest/v1/episodes**", async (route) => {
    if (route.request().method() === "PATCH" && !delayed) {
      delayed = true;
      releaseFirstSave?.();
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    await route.continue();
  });

  await page.goto("/");
  await waitForStudioHydration(page);
  const firstMessage = page.getByRole("textbox", { name: "Message from Jaz" }).first();
  await firstMessage.fill("first edit");
  await firstSaveStarted;
  await firstMessage.fill("latest edit");

  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saved", { timeout: 7000 });
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Message from Jaz" }).first()).toHaveValue("latest edit");
});

test("a stale tab reports a conflict instead of overwriting", async ({ authenticatedPage: firstPage }) => {
  await firstPage.goto("/");
  await expect(firstPage).toHaveURL(/\/p\/[0-9a-f-]+$/);
  const editorUrl = firstPage.url();
  const stalePage = await firstPage.context().newPage();
  await stalePage.goto(editorUrl);
  await waitForStudioHydration(firstPage);
  await waitForStudioHydration(stalePage);

  await firstPage.getByRole("textbox", { name: "Message from Jaz" }).first().fill("newer edit");
  await expect(firstPage.getByRole("status", { name: "Save status" })).toHaveText("Saving…", { timeout: 2000 });
  await expect(firstPage.getByRole("status", { name: "Save status" })).toHaveText("Saved", { timeout: 5000 });

  await stalePage.getByRole("textbox", { name: "Message from Jaz" }).first().fill("stale edit");
  await expect(stalePage.getByRole("status", { name: "Save status" }))
    .toHaveText("Changed elsewhere", { timeout: 5000 });
  await expect(stalePage.getByRole("button", { name: "Reload" })).toBeVisible();
  await stalePage.close();
});
