import { readFile } from "node:fs/promises";
import JSZip from "jszip";

import { expect, test } from "./fixtures";

// The studio's three panels are fixed/near-fixed width (820px + 340px + gaps),
// so the default 1280px test viewport leaves almost no room for the center
// preview panel where the Export button lives — widen it to a realistic
// desktop size instead.
test.use({ viewport: { width: 1600, height: 900 } });

async function sendMessage(page: import("@playwright/test").Page, text: string) {
  await page.getByRole("textbox", { name: /new message/i }).fill(text);
  await page
    .getByRole("region", { name: "Chat Script Timeline" })
    .getByRole("button", { name: "Send message" })
    .click();
}

async function switchSender(page: import("@playwright/test").Page, name: string) {
  const composer = page.getByRole("textbox", { name: /new message/i });
  await composer.fill(`@${name}`);
  await composer.press("Enter");
}

async function downloadFrames(
  page: import("@playwright/test").Page,
  ratioName: string,
): Promise<Buffer[]> {
  const dialog = page.getByRole("dialog", { name: "Export episode" });
  if (!(await dialog.isVisible())) {
    await page.getByRole("button", { name: "Export", exact: true }).click();
  }
  await dialog.getByRole("button", { name: ratioName }).click();

  const exportButton = dialog.getByRole("button", { name: /Export \d+ PNGs as ZIP/ });
  await expect(exportButton).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent("download"), exportButton.click()]);
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("Playwright did not provide a path for the exported ZIP");

  const zip = await JSZip.loadAsync(await readFile(downloadPath));
  return Promise.all(
    Object.values(zip.files)
      .filter((entry) => !entry.dir && entry.name.endsWith(".png"))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((entry) => entry.async("nodebuffer")),
  );
}

async function downloadDeviceFrames(page: import("@playwright/test").Page): Promise<Buffer[]> {
  const dialog = page.getByRole("dialog", { name: "Export episode" });
  if (!(await dialog.isVisible())) {
    await page.getByRole("button", { name: "Export", exact: true }).click();
  }
  await dialog.getByRole("button", { name: "Full device" }).click();

  const exportButton = dialog.getByRole("button", { name: /Export \d+ PNGs as ZIP/ });
  await expect(exportButton).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent("download"), exportButton.click()]);
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("Playwright did not provide a path for the exported ZIP");

  const zip = await JSZip.loadAsync(await readFile(downloadPath));
  return Promise.all(
    Object.values(zip.files)
      .filter((entry) => !entry.dir && entry.name.endsWith(".png"))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((entry) => entry.async("nodebuffer")),
  );
}

function pngDimensions(png: Buffer) {
  expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test("a conversation that fits one screen downloads a single PNG", async ({ page }) => {
  await page.goto("/");
  await sendMessage(page, "hey");

  await page.getByRole("button", { name: "Export" }).click();
  await expect(page.getByRole("dialog", { name: "Export episode" })).toBeVisible();

  const exportButton = page.getByRole("button", { name: "Export as PNG" });
  await expect(exportButton).toBeEnabled();

  const [download] = await Promise.all([page.waitForEvent("download"), exportButton.click()]);

  expect(download.suggestedFilename()).toMatch(/\.png$/);
});

test("a conversation split across frames downloads a zip of numbered PNGs", async ({ page }) => {
  await page.goto("/");
  await sendMessage(page, "first frame");
  await sendMessage(page, "second frame");

  // Force a 2-frame split deterministically via the manual frame-break
  // toggle, rather than relying on enough text to overflow the page height.
  // The seeded conversation already has messages, so several break points
  // exist — use the first one.
  await page.getByRole("button", { name: "Insert frame break here" }).first().click();

  await page.getByRole("button", { name: "Export" }).click();
  const dialog = page.getByRole("dialog", { name: "Export episode" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("2", { exact: true })).toBeVisible();

  const exportButton = page.getByRole("button", { name: /Export \d+ PNGs as ZIP/ });
  await expect(exportButton).toBeEnabled();

  const [download] = await Promise.all([page.waitForEvent("download"), exportButton.click()]);

  expect(download.suggestedFilename()).toMatch(/\.zip$/);
});

test("signed-in long conversations export complete visual sequences at multiple aspect ratios", async ({ authenticatedPage: page }) => {
  test.setTimeout(120_000);
  await page.goto("/");

  const messages = [
    "EXPORT 01 — a short opening message",
    "EXPORT 02 — this message is deliberately longer so that it wraps across multiple lines and exercises measured bubble height near a frame boundary.",
    "EXPORT 03 — short",
    "EXPORT 04 — another long message with enough words to create a tall bubble. It must appear exactly once, fully visible, without being clipped at the bottom.",
    "EXPORT 05 — midpoint marker",
    "EXPORT 06 — continuation frames should begin near the header instead of reserving a large invisible day and time row.",
    "EXPORT 07 — short",
    "EXPORT 08 — final numbered message in this visual export regression conversation.",
  ];
  for (const message of messages) await sendMessage(page, message);
  await switchSender(page, "Kylle");
  await sendMessage(
    page,
    "EXPORT 09 — outgoing final marker. Delivered must remain fully visible on an opaque background below this bubble.",
  );

  const ratios = [
    { button: "Tall (9:19.5)", slug: "tall", frameCount: 2, dimensions: { width: 750, height: 1626 } },
    { button: "Portrait (4:5)", slug: "portrait", frameCount: 4, dimensions: { width: 750, height: 938 } },
    { button: "Classic (3:4)", slug: "classic", frameCount: 3, dimensions: { width: 750, height: 1000 } },
    { button: "Square (1:1)", slug: "square", frameCount: 5, dimensions: { width: 750, height: 750 } },
  ];

  for (const ratio of ratios) {
    const frames = await downloadFrames(page, ratio.button);
    expect(frames).toHaveLength(ratio.frameCount);

    for (const [index, frame] of frames.entries()) {
      expect(pngDimensions(frame)).toEqual(ratio.dimensions);
      expect(frame).toMatchSnapshot(`${ratio.slug}-frame-${index + 1}.png`, {
        maxDiffPixelRatio: 0,
      });
    }
  }
});

test("a signed-in extremely long bubble remains visible in square exports", async ({ authenticatedPage: page }) => {
  test.setTimeout(60_000);
  await page.goto("/");

  await sendMessage(
    page,
    Array.from(
      { length: 90 },
      (_, index) => `LONG-${String(index + 1).padStart(2, "0")}`,
    ).join(" "),
  );
  await page.getByRole("button", { name: "Add timestamp" }).click();
  await page
    .getByPlaceholder("Today 9:41 AM")
    .fill(Array.from({ length: 150 }, (_, index) => `TIME-${index + 1}`).join(" "));

  const frames = await downloadFrames(page, "Square (1:1)");
  expect(frames.length).toBeGreaterThan(1);
  for (const [index, frame] of frames.entries()) {
    expect(pngDimensions(frame)).toEqual({ width: 750, height: 750 });
    expect(frame).toMatchSnapshot(`overlong-square-frame-${index + 1}.png`, {
      maxDiffPixelRatio: 0,
    });
  }
});

test("signed-in mixed messages retain timestamps, manual breaks, themes, and read status", async ({ authenticatedPage: page }) => {
  test.setTimeout(90_000);
  await page.goto("/");

  await sendMessage(page, "MIXED 01 — incoming before timestamp");
  await switchSender(page, "Kylle");
  await sendMessage(page, "MIXED 02 — outgoing before timestamp");
  await page.getByRole("button", { name: "Add timestamp" }).click();
  await switchSender(page, "Jaz");
  await sendMessage(page, "MIXED 03 — incoming after timestamp with enough text to wrap onto another line.");
  await switchSender(page, "Kylle");
  await sendMessage(page, "MIXED 04 — outgoing final message with Read status");

  await page.getByRole("button", { name: "Dark" }).click();
  await page.getByRole("button", { name: "Green" }).click();
  await page.getByRole("button", { name: "Read" }).click();
  await page.getByRole("textbox", { name: "Read time" }).fill("11:59 PM");
  await page.getByRole("button", { name: "Insert frame break here" }).nth(3).click();

  const squareFrames = await downloadFrames(page, "Square (1:1)");
  expect(squareFrames.length).toBeGreaterThanOrEqual(2);
  for (const [index, frame] of squareFrames.entries()) {
    expect(pngDimensions(frame)).toEqual({ width: 750, height: 750 });
    expect(frame).toMatchSnapshot(`mixed-dark-square-frame-${index + 1}.png`, {
      maxDiffPixelRatio: 0,
    });
  }

  const deviceFrames = await downloadDeviceFrames(page);
  expect(deviceFrames.length).toBeGreaterThanOrEqual(2);
  for (const [index, frame] of deviceFrames.entries()) {
    expect(pngDimensions(frame)).toEqual({ width: 782, height: 1658 });
    expect(frame).toMatchSnapshot(`mixed-dark-device-frame-${index + 1}.png`, {
      maxDiffPixelRatio: 0,
    });
  }
});

test("keyboard exports use the native tall frame and include the keyboard", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Show" }).click();
  await page.getByRole("button", { name: "Export", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Export episode" });
  await expect(dialog.getByRole("button", { name: "Square (1:1)" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Tall (9:19.5)" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const exportButton = dialog.getByRole("button", { name: "Export as PNG" });
  await expect(exportButton).toBeEnabled();

  const [download] = await Promise.all([page.waitForEvent("download"), exportButton.click()]);
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("Playwright did not provide a path for the exported PNG");
  const frame = await readFile(downloadPath);

  expect(pngDimensions(frame)).toEqual({ width: 750, height: 1626 });
  expect(frame).toMatchSnapshot("keyboard-native-frame.png", { maxDiffPixelRatio: 0 });
});
