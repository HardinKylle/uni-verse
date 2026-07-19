import { expect, test } from "./fixtures";

test.use({ viewport: { width: 1600, height: 900 } });
test.setTimeout(90_000);

function episodes(page: import("@playwright/test").Page) {
  return page.getByRole("navigation", { name: "Episodes" });
}

function preview(page: import("@playwright/test").Page) {
  return page.getByRole("region", { name: "Message preview" });
}

async function waitForSaved(page: import("@playwright/test").Page) {
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saving…", {
    timeout: 2000,
  });
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saved", {
    timeout: 5000,
  });
}

test("a writer creates, renames, and switches between episodes without losing edits", async ({
  authenticatedPage: page,
}) => {
  const episodeWrites: unknown[] = [];
  page.on("request", (request) => {
    if (request.method() === "PATCH" && request.url().includes("/rest/v1/episodes")) {
      episodeWrites.push(request.postDataJSON());
    }
  });

  await page.goto("/");
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]+$/);
  const projectUrl = page.url();
  const scriptTimeline = page.getByRole("region", { name: "Chat Script Timeline" });

  await scriptTimeline.getByRole("textbox", { name: "New message" }).fill("episode one immediate edit");
  await scriptTimeline.getByRole("button", { name: "Send message" }).click();
  await episodes(page).getByRole("button", { name: "New episode" }).click();

  await expect(page).toHaveURL(/\?episode=[0-9a-f-]+$/);
  expect(episodeWrites).toContainEqual(expect.objectContaining({
    script: expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({ text: "episode one immediate edit" }),
      ]),
    }),
  }));
  const secondEpisodeUrl = page.url();
  await expect(page.getByText("No messages yet")).toBeVisible();
  await expect(page.getByRole("listitem").locator("strong")).toHaveText(["Jaz", "Kylle"]);

  await page.getByLabel("Episode title").fill("Second act");
  await page.getByRole("button", { name: "Edit" }).first().click();
  await page.getByLabel("Character name").fill("Jazz");
  await scriptTimeline.getByRole("textbox", { name: "New message" }).fill("episode two immediate edit");
  await scriptTimeline.getByRole("button", { name: "Send message" }).click();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.getByRole("button", { name: "Green", exact: true }).click();
  await episodes(page).getByRole("button", { name: "Episode 1", exact: true }).click();

  await expect(page).toHaveURL(projectUrl);
  await expect(preview(page).getByText("episode one immediate edit", { exact: true })).toBeVisible();
  await expect(preview(page).getByText("episode two immediate edit", { exact: true })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Light", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Blue", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("listitem").locator("strong")).toHaveText(["Jazz", "Kylle"]);

  await episodes(page).getByRole("button", { name: "Second act", exact: true }).click();
  await expect(page).toHaveURL(secondEpisodeUrl);
  await expect(page.getByLabel("Episode title")).toHaveValue("Second act");
  await expect(preview(page).getByText("episode two immediate edit", { exact: true })).toBeVisible();
  await expect(preview(page).getByText("episode one immediate edit", { exact: true })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Dark", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Green", exact: true })).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(page.getByLabel("Episode title")).toHaveValue("Second act");
  await expect(preview(page).getByText("episode two immediate edit", { exact: true })).toBeVisible();

  await page.goto(`${projectUrl}?episode=00000000-0000-4000-8000-000000000000`);
  await expect(page.getByLabel("Episode title")).toHaveValue("Episode 1");
  await expect(preview(page).getByText("episode one immediate edit", { exact: true })).toBeVisible();
});

test("a save conflict blocks episode switching and keeps the local edit visible", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]+$/);
  const projectUrl = page.url();

  await episodes(page).getByRole("button", { name: "New episode" }).click();
  await expect(page).toHaveURL(/\?episode=[0-9a-f-]+$/);
  await page.goto(projectUrl);

  const stalePage = await page.context().newPage();
  await stalePage.goto(projectUrl);

  const firstTimeline = page.getByRole("region", { name: "Chat Script Timeline" });
  await firstTimeline.getByRole("textbox", { name: "New message" }).fill("newer tab edit");
  await firstTimeline.getByRole("button", { name: "Send message" }).click();
  await waitForSaved(page);

  const staleTimeline = stalePage.getByRole("region", { name: "Chat Script Timeline" });
  await staleTimeline.getByRole("textbox", { name: "New message" }).fill("unsaved stale edit");
  await staleTimeline.getByRole("button", { name: "Send message" }).click();
  await episodes(stalePage).getByRole("button", { name: "Episode 2", exact: true }).click();

  await expect(stalePage).toHaveURL(projectUrl);
  await expect(stalePage.getByRole("status", { name: "Save status" }))
    .toHaveText("Changed elsewhere — reload", { timeout: 5000 });
  await expect(preview(stalePage).getByText("unsaved stale edit", { exact: true })).toBeVisible();
  await stalePage.close();
});

test("switching preserves an edit that reverts while another save is in flight", async ({
  authenticatedPage: page,
}) => {
  let signalFirstSave: (() => void) | undefined;
  const firstSaveStarted = new Promise<void>((resolve) => {
    signalFirstSave = resolve;
  });
  let delayed = false;
  await page.route("**/rest/v1/episodes**", async (route) => {
    if (route.request().method() === "PATCH" && !delayed) {
      delayed = true;
      signalFirstSave?.();
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    await route.continue();
  });

  await page.goto("/");
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]+$/);

  await page.getByLabel("Episode title").fill("Temporary title");
  await firstSaveStarted;
  await page.getByLabel("Episode title").fill("Episode 1");
  await episodes(page).getByRole("button", { name: "New episode" }).click();

  await expect(page).toHaveURL(/\?episode=[0-9a-f-]+$/);
  await episodes(page).getByRole("button", { name: "Episode 1", exact: true }).click();
  await expect(page.getByLabel("Episode title")).toHaveValue("Episode 1");
});
