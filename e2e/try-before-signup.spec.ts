import { readFile } from "node:fs/promises";
import JSZip from "jszip";

import { expect, test } from "./fixtures";

test.use({ viewport: { width: 1600, height: 900 } });

test("anonymous export is capped at three frames", async ({ page }) => {
  await page.goto("/");

  const breakButtons = page.getByRole("button", { name: "Insert frame break here" });
  for (let index = 0; index < 3; index += 1) await breakButtons.first().click();

  await page.getByRole("button", { name: "Export", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Export episode" });
  await expect(dialog.getByText("Only the first 3 of 4 frames will be exported.", { exact: false })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    dialog.getByRole("button", { name: "Export 3 PNGs as ZIP" }).click(),
  ]);
  const path = await download.path();
  if (!path) throw new Error("Playwright did not provide a path for the exported ZIP");
  const zip = await JSZip.loadAsync(await readFile(path));
  const pngs = Object.values(zip.files).filter((entry) => !entry.dir && entry.name.endsWith(".png"));

  expect(pngs).toHaveLength(3);
});

test("anonymous studio locks frame shapes and cast growth behind sign-in", async ({ page }) => {
  await page.goto("/");

  // Demo edits surface the no-carry-over note next to the CTA.
  await expect(page.getByText("Demo edits won't be carried over")).toHaveCount(0);
  const composer = page.getByRole("textbox", { name: /new message/i });
  await composer.fill("an anonymous edit");
  await composer.press("Enter");
  await expect(page.getByText("Demo edits won't be carried over")).toBeVisible();

  // Cast caps at three characters.
  const addCharacter = page.getByRole("button", { name: "Add character" });
  await expect(addCharacter).toBeEnabled();
  await addCharacter.click();
  await expect(addCharacter).toBeDisabled();
  await expect(page.getByText("Sign in to add more characters.")).toBeVisible();

  // Only the native Tall frame shape and Screen only style are available.
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Export episode" });
  await expect(dialog.getByRole("button", { name: "Tall (9:19.5)" })).toHaveAttribute("aria-pressed", "true");
  for (const shape of ["Portrait (4:5)", "Classic (3:4)", "Square (1:1)"]) {
    await expect(dialog.getByRole("button", { name: shape })).toBeDisabled();
  }
  await expect(dialog.getByRole("button", { name: "Full device" })).toBeDisabled();
  await expect(dialog.getByText("Sign in to unlock all frame shapes.")).toBeVisible();
});

test("signing in lifts the anonymous limits", async ({ authenticatedPage: page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  await expect(page.getByText("Demo edits won't be carried over")).toHaveCount(0);

  const addCharacter = page.getByRole("button", { name: "Add character" });
  await addCharacter.click();
  await addCharacter.click();
  await expect(addCharacter).toBeEnabled();
  await expect(page.getByText("Sign in to add more characters.")).toHaveCount(0);

  await page.getByRole("button", { name: "Export", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Export episode" });
  for (const shape of ["Portrait (4:5)", "Classic (3:4)", "Square (1:1)"]) {
    await expect(dialog.getByRole("button", { name: shape })).toBeEnabled();
  }
  await expect(dialog.getByRole("button", { name: "Full device" })).toBeEnabled();
  await expect(dialog.getByText("Sign in to unlock all frame shapes.")).toHaveCount(0);
});
