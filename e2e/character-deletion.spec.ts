import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

test.use({ viewport: { width: 1600, height: 900 } });
test.setTimeout(90_000);

function cast(page: Page) {
  return page.getByRole("heading", { name: "Cast" }).locator("..");
}

function episodes(page: Page) {
  return page.getByRole("navigation", { name: "Episodes" });
}

async function switchEpisode(page: Page, name: string) {
  await episodes(page).getByRole("button", { name: /Switch episode/ }).click();
  await page.getByRole("option", { name, exact: true }).click();
}

function timeline(page: Page) {
  return page.getByRole("region", { name: "Chat Script Timeline" });
}

async function waitForSaved(page: Page) {
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saved", {
    timeout: 10_000,
  });
}

async function addThirdCharacter(page: Page) {
  await cast(page).getByRole("button", { name: "Add character" }).click();
  await page.getByLabel("Character name").fill("Mina");
  await waitForSaved(page);
}

async function openCharacterEditor(page: Page, name: string) {
  await cast(page)
    .getByRole("listitem")
    .filter({ hasText: name })
    .getByRole("button", { name: "Edit" })
    .click();
}

async function createSecondEpisodeWithJazMessage(page: Page, text: string) {
  await episodes(page).getByRole("button", { name: "New episode" }).click();
  await expect(page).toHaveURL(/\?episode=[0-9a-f-]+$/);
  await timeline(page).getByRole("textbox", { name: "New message" }).fill(text);
  await timeline(page).getByRole("button", { name: "Send message" }).click();
  await waitForSaved(page);
  return page.url();
}

test("reassigns a used character across multiple episodes", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]+$/);
  const projectUrl = page.url();
  await addThirdCharacter(page);
  const secondEpisodeUrl = await createSecondEpisodeWithJazMessage(page, "Jaz in episode two");

  await switchEpisode(page, "Episode 1");
  await expect(page).toHaveURL(projectUrl);
  await openCharacterEditor(page, "Jaz");
  await page.getByRole("button", { name: "Delete character" }).click();

  const dialog = page.getByRole("alertdialog", { name: "Delete Jaz?" });
  await expect(dialog).toBeVisible();
  const closeButton = dialog.getByRole("button", { name: "Close delete dialog" });
  const [dialogBox, closeButtonBox] = await Promise.all([
    dialog.boundingBox(),
    closeButton.boundingBox(),
  ]);
  if (!dialogBox || !closeButtonBox) {
    throw new Error("could not measure the character deletion dialog");
  }
  expect(closeButtonBox.x + closeButtonBox.width).toBeGreaterThan(
    dialogBox.x + dialogBox.width - 64,
  );
  expect(closeButtonBox.y).toBeLessThan(dialogBox.y + 64);
  await expect(dialog.getByRole("listitem").filter({ hasText: "Episode 1" }))
    .toContainText("2 messages");
  await expect(dialog.getByRole("listitem").filter({ hasText: "Episode 2" }))
    .toContainText("1 message");
  await expect(dialog.getByText(/currently “me”/)).toContainText("Episode 2");
  await dialog.getByRole("button", { name: /Reassign messages to/ }).click();
  await page.getByRole("option", { name: "Kylle" }).click();
  await dialog.getByRole("button", { name: "Reassign and delete" }).click();
  await expect(dialog).not.toBeVisible();
  await waitForSaved(page);

  await expect(cast(page).getByText("Jaz", { exact: true })).toHaveCount(0);
  await expect(timeline(page).getByRole("textbox", { name: "Message from Kylle" })).toHaveCount(4);

  await switchEpisode(page, "Episode 2");
  await expect(page).toHaveURL(secondEpisodeUrl);
  await expect(timeline(page).getByRole("textbox", { name: "Message from Kylle" }))
    .toHaveValue("Jaz in episode two");
  await page.reload();
  await expect(timeline(page).getByRole("textbox", { name: "Message from Kylle" }))
    .toHaveValue("Jaz in episode two");
});

test("deletes a character's messages and their frame breaks across multiple episodes", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]+$/);
  const projectUrl = page.url();
  await addThirdCharacter(page);
  const secondEpisodeUrl = await createSecondEpisodeWithJazMessage(
    page,
    "keep this episode two message",
  );

  await timeline(page).getByRole("button", { name: "Switch sender" }).click();
  await timeline(page).getByRole("textbox", { name: "New message" }).fill("remove this episode two message");
  await timeline(page).getByRole("button", { name: "Send message" }).click();
  await timeline(page).getByRole("button", { name: "Insert frame break here" }).last().click();
  await waitForSaved(page);

  await switchEpisode(page, "Episode 1");
  await expect(page).toHaveURL(projectUrl);
  await openCharacterEditor(page, "Jaz");
  await page.getByRole("button", { name: "Delete character" }).click();

  const dialog = page.getByRole("alertdialog", { name: "Delete Jaz?" });
  await expect(dialog.getByRole("listitem").filter({ hasText: "Episode 1" }))
    .toContainText("2 messages");
  await expect(dialog.getByRole("listitem").filter({ hasText: "Episode 2" }))
    .toContainText("1 message");
  await dialog.getByRole("button", { name: "Delete messages and character" }).click();
  await expect(dialog).not.toBeVisible();
  await waitForSaved(page);

  await expect(cast(page).getByText("Jaz", { exact: true })).toHaveCount(0);
  await expect(timeline(page).getByRole("textbox", { name: "Message from Kylle" })).toHaveCount(2);

  await switchEpisode(page, "Episode 2");
  await expect(page).toHaveURL(secondEpisodeUrl);
  await expect(timeline(page).getByRole("textbox", { name: "Message from Kylle" }))
    .toHaveValue("keep this episode two message");
  await expect(timeline(page).getByText("remove this episode two message")).toHaveCount(0);
  await expect(timeline(page).getByRole("button", { name: "Remove frame break" })).toHaveCount(0);
});
