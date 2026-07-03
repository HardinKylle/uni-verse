import { expect, test } from "@playwright/test";

test("home page loads with no console errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", { name: "AU Studio" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Message preview" })).toBeVisible();

  await page.getByRole("textbox", { name: /new message/i }).fill("hello from the test");
  await page.getByRole("button", { name: /add to conversation/i }).click();

  await expect(page.getByText("3 messages")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Message preview" }).getByText("hello from the test"),
  ).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
