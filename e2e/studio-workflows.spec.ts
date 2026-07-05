import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 900 } });

test.describe("narrow desktop viewport", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("preserves the phone preview instead of crushing it", async ({ page }) => {
    await page.goto("/");
    const metrics = await page.evaluate(() => {
      const preview = document.querySelector<HTMLElement>('[aria-label="Message preview"]');
      return {
        documentWidth: document.documentElement.scrollWidth,
        previewWidth: preview?.getBoundingClientRect().width ?? 0,
      };
    });

    expect(metrics.documentWidth).toBeGreaterThanOrEqual(1600);
    expect(metrics.previewWidth).toBeGreaterThanOrEqual(390);
    await expect(page.getByRole("region", { name: "Message preview" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export", exact: true })).toBeVisible();
  });
});

test("message and timestamp controls preserve timeline state", async ({ page }) => {
  await page.goto("/");
  const timeline = page.getByRole("region", { name: "Chat Script Timeline" });

  await timeline.getByRole("button", { name: "Duplicate message" }).first().click();
  await expect(timeline.getByRole("textbox", { name: "Message from Jaz" })).toHaveCount(3);

  await timeline.getByRole("button", { name: "Switch sender" }).first().click();
  await expect(timeline.getByRole("textbox", { name: "Message from Kylle" })).toHaveCount(3);

  await timeline.getByRole("button", { name: "Add timestamp" }).click();
  const timestamp = timeline.getByRole("textbox", { name: "Timestamp text" });
  await expect(timestamp).toHaveValue("Today 9:41 AM");
  await timestamp.fill("Three hours later");
  await timeline.getByRole("button", { name: "Duplicate timestamp" }).click();
  await expect(timeline.getByRole("textbox", { name: "Timestamp text" })).toHaveCount(2);

  await timeline.getByRole("button", { name: "Insert frame break here" }).last().click();
  await expect(timeline.getByRole("button", { name: "Remove frame break" })).toBeVisible();
  await timeline.getByRole("button", { name: "Remove frame break" }).click();
  await expect(timeline.getByRole("button", { name: "Remove frame break" })).toHaveCount(0);

  await timeline.getByRole("button", { name: "Delete timestamp" }).last().click();
  await expect(timeline.getByRole("textbox", { name: "Timestamp text" })).toHaveCount(1);
});

test("mentions, multiline messages, and sender selection work from the keyboard", async ({ page }) => {
  await page.goto("/");
  const timeline = page.getByRole("region", { name: "Chat Script Timeline" });
  const composer = timeline.getByRole("textbox", { name: "New message" });

  await composer.fill("draft @ky");
  await expect(page.getByRole("listbox").getByRole("option", { name: "Kylle" })).toBeVisible();
  await composer.press("Enter");
  await expect(composer).toHaveValue("draft ");

  await composer.fill("line one");
  await composer.press("Shift+Enter");
  await composer.type("line two");
  await composer.press("Enter");

  await expect(timeline.getByRole("textbox", { name: "Message from Kylle" }).last()).toHaveValue(
    "line one\nline two",
  );
  await expect(page.getByRole("region", { name: "Message preview" }).getByText(/line one/)).toBeVisible();
});

test("cast and screen settings remain synchronized with the preview", async ({ page }) => {
  await page.goto("/");
  const preview = page.getByRole("region", { name: "Message preview" });

  await page.getByRole("button", { name: "Add character" }).click();
  const characterName = page.getByRole("textbox", { name: "Character name" });
  await characterName.fill("Morgan");
  await expect(page.getByRole("combobox", { name: "Sending as" })).toContainText("Morgan");

  const ownerSelect = page.getByRole("combobox", { name: "Whose phone" });
  await ownerSelect.click();
  await page.getByRole("listbox", { name: "Whose phone" }).getByRole("option", { name: "Morgan" }).click();
  await expect(page.getByText("This phone")).toHaveCount(1);

  await page.getByRole("button", { name: "Dark" }).click();
  await page.getByRole("button", { name: "Green" }).click();
  await page.getByRole("button", { name: "Show" }).click();
  await page.getByRole("textbox", { name: "Inbox Number" }).fill("");
  await page.getByRole("textbox", { name: "Day" }).fill("Saturday");
  await page.getByRole("textbox", { name: "Time", exact: true }).fill("12:34");
  await page.getByRole("button", { name: "PM" }).click();

  await expect(preview.locator("[data-theme='dark'][data-bubble='green']")).toBeVisible();
  await expect(preview.getByText("Saturday")).toBeVisible();
  await expect(preview.getByText("12:34").first()).toBeVisible();
  await expect(preview.getByText("Q", { exact: true })).toBeVisible();
  await expect(preview.getByText("12", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Close properties" }).click();
  await expect(page.getByRole("button", { name: "Open properties" })).toBeVisible();
  await page.getByRole("button", { name: "Open properties" }).click();
  await expect(page.getByRole("combobox", { name: "Whose phone" })).toBeVisible();
});

test("avatar upload can be applied and removed", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Edit" }).first().click();

  await page.locator('input[type="file"]').setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();

  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
});

test("empty conversations disable export with a clear label", async ({ page }) => {
  await page.goto("/");
  const timeline = page.getByRole("region", { name: "Chat Script Timeline" });
  while ((await timeline.getByRole("button", { name: "Delete message" }).count()) > 0) {
    await timeline.getByRole("button", { name: "Delete message" }).first().click();
  }

  await page.getByRole("button", { name: "Export", exact: true }).click();
  const disabledAction = page.getByRole("button", { name: "Nothing to export" });
  await expect(disabledAction).toBeVisible();
  await expect(disabledAction).toBeDisabled();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Export episode" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export", exact: true })).toBeFocused();
});
