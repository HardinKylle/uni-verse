import { readFile } from "node:fs/promises";
import { PNG } from "pngjs";
import { createAdminClient, expect, test } from "./fixtures";
import type { Page } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 900 } });
test.setTimeout(60_000);

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

// Mirrors workspace-persistence.spec.ts's dance: toggling the properties panel
// round-trip proves the client has hydrated before interacting further.
async function waitForStudioHydration(page: Page) {
  await page.getByRole("button", { name: "Close properties" }).click();
  await expect(page.getByRole("button", { name: "Open properties" })).toBeVisible();
  await page.getByRole("button", { name: "Open properties" }).click();
  await expect(page.getByRole("button", { name: "Close properties" })).toBeVisible();
}

async function openCharacterEditor(page: Page, index = 0) {
  await page.getByRole("button", { name: "Edit" }).nth(index).click();
}

/** The character-name input's `id` attribute embeds the character's real id (see editor-sidebar.tsx). */
async function editingCharacterId(page: Page): Promise<string> {
  const domId = await page.getByLabel("Character name").getAttribute("id");
  const match = domId?.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-name$/i);
  if (!match) throw new Error(`could not read a character id from name input id "${domId}"`);
  return match[1];
}

/**
 * The phone-preview header shows whichever character isn't the "me" owner —
 * Jaz in the demo seed. Scoped from the contact's name span up to its shared
 * container (Avatar + name), then to the first `aria-hidden` descendant
 * (the Avatar itself renders before the name row's chevron icon in DOM order).
 */
function contactAvatarLocator(page: Page) {
  return page
    .getByRole("region", { name: "Message preview" })
    .getByText("Jaz", { exact: true })
    .locator("xpath=../..")
    .locator("[aria-hidden='true']")
    .first();
}

function contactAvatarBackground(page: Page) {
  return contactAvatarLocator(page).evaluate((el) => getComputedStyle(el).backgroundImage);
}

/** Pulls the storage object path out of a `url("…/storage/v1/object/public/avatars/<path>")` CSS value. */
function avatarPathFromBackground(background: string): string {
  const match = background.match(/\/avatars\/([^")]+)/);
  if (!match) throw new Error(`could not parse an avatar storage path from "${background}"`);
  return match[1];
}

// `.list()`, not `.download()`: the storage GET/download endpoint sits behind
// a CDN that honors the object's `Cache-Control: max-age=3600`, so once a
// path has been downloaded, a later `.download()` of that same path can keep
// serving the cached bytes well after the object is actually deleted (verified
// manually). `.list()` reflects real bucket metadata and isn't cached that way.
async function storageObjectExists(admin: ReturnType<typeof createAdminClient>, path: string): Promise<boolean> {
  const lastSlash = path.lastIndexOf("/");
  const folder = lastSlash === -1 ? "" : path.slice(0, lastSlash);
  const name = lastSlash === -1 ? path : path.slice(lastSlash + 1);
  const { data, error } = await admin.storage.from("avatars").list(folder, { search: name });
  if (error) throw error;
  return data.some((entry) => entry.name === name);
}

test("cast edits and episode metadata autosave only changed rows and survive reload", async ({
  authenticatedPage: page,
}) => {
  const characterWrites: { method: string; body: unknown; url: string }[] = [];
  const episodeWrites: unknown[] = [];
  page.on("request", (request) => {
    if (request.method() === "PATCH" && request.url().includes("/rest/v1/episodes")) {
      episodeWrites.push(request.postDataJSON());
    }
    if (!request.url().includes("/rest/v1/characters")) return;
    const method = request.method();
    if (method === "POST" || method === "DELETE") {
      characterWrites.push({ method, body: request.postDataJSON(), url: request.url() });
    }
  });

  await page.goto("/");
  await expect(page.getByText(/Signed in as/)).toBeVisible();
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saved");
  await waitForStudioHydration(page);

  await openCharacterEditor(page, 0);
  const jazId = await editingCharacterId(page);
  await page.getByLabel("Character name").fill("Jazzy");
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saving…", { timeout: 2000 });
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saved", { timeout: 5000 });

  // Only the renamed character's row was written — its sibling was untouched
  // — and the written row is actually the edited character with the new name.
  expect(characterWrites).toHaveLength(1);
  expect(characterWrites[0].method).toBe("POST");
  expect(characterWrites[0].body).toHaveLength(1);
  expect((characterWrites[0].body as Array<{ id: string; name: string }>)[0]).toMatchObject({
    id: jazId,
    name: "Jazzy",
  });

  // Recoloring likewise writes only that one row, with the new color.
  const writesAfterRename = characterWrites.length;
  await page.getByRole("button", { name: "Use color #5aa9e6" }).click();
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saving…", { timeout: 2000 });
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saved", { timeout: 5000 });
  const recolorWrites = characterWrites.slice(writesAfterRename);
  expect(recolorWrites).toHaveLength(1);
  expect(recolorWrites[0].method).toBe("POST");
  expect((recolorWrites[0].body as Array<{ id: string; color: string }>)[0]).toMatchObject({
    id: jazId,
    color: "#5aa9e6",
  });

  const writesAfterRecolor = characterWrites.length;
  await page.getByLabel("Episode title").fill("Renamed Episode");
  await page.getByLabel("Episode description").fill("New episode description");
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saving…", { timeout: 2000 });
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saved", { timeout: 5000 });
  expect(episodeWrites.at(-1)).toMatchObject({
    title: "Renamed Episode",
    description: "New episode description",
  });
  // Episode metadata is a separate slice — it must not trigger character writes.
  expect(characterWrites.length).toBe(writesAfterRecolor);

  // Adding a character writes only the new row.
  const writesAfterProjectEdit = characterWrites.length;
  await page.getByRole("button", { name: "Add character" }).click();
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saving…", { timeout: 2000 });
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saved", { timeout: 5000 });
  const addWrites = characterWrites.slice(writesAfterProjectEdit);
  expect(addWrites).toHaveLength(1);
  expect(addWrites[0].method).toBe("POST");
  expect(addWrites[0].body).toHaveLength(1);
  const addedCharacterId = (addWrites[0].body as Array<{ id: string }>)[0].id;

  // Deleting that same character (its editor auto-opens on add) writes only
  // its removal — its siblings are untouched.
  const writesAfterAdd = characterWrites.length;
  await page.getByRole("button", { name: "Delete character" }).click();
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saving…", { timeout: 2000 });
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saved", { timeout: 5000 });
  const deleteWrites = characterWrites.slice(writesAfterAdd);
  expect(deleteWrites).toHaveLength(1);
  expect(deleteWrites[0].method).toBe("DELETE");
  expect(deleteWrites[0].url).toContain(addedCharacterId);

  // Reordering the (now 2-character) cast upserts both rows — each one's
  // `position` changed — but nothing else.
  const writesAfterDelete = characterWrites.length;
  const castNames = page.getByRole("listitem").locator("strong");
  const namesBeforeDrag = await castNames.allTextContents();
  const handles = page.getByLabel(/Reorder/);
  const firstHandleBox = await handles.first().boundingBox();
  const secondHandleBox = await handles.nth(1).boundingBox();
  if (!firstHandleBox || !secondHandleBox) throw new Error("could not measure cast drag handles");
  await page.mouse.move(firstHandleBox.x + firstHandleBox.width / 2, firstHandleBox.y + firstHandleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(firstHandleBox.x + firstHandleBox.width / 2, firstHandleBox.y + firstHandleBox.height / 2 + 10, { steps: 5 });
  await page.mouse.move(secondHandleBox.x + secondHandleBox.width / 2, secondHandleBox.y + secondHandleBox.height / 2 + 5, { steps: 10 });
  await page.mouse.move(secondHandleBox.x + secondHandleBox.width / 2, secondHandleBox.y + secondHandleBox.height / 2 + 15, { steps: 10 });
  await page.mouse.up();

  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saving…", { timeout: 2000 });
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saved", { timeout: 5000 });
  const namesAfterDrag = await castNames.allTextContents();
  expect(namesAfterDrag).not.toEqual(namesBeforeDrag);
  const reorderWrites = characterWrites.slice(writesAfterDelete);
  expect(reorderWrites).toHaveLength(1);
  expect(reorderWrites[0].method).toBe("POST");
  expect(reorderWrites[0].body).toHaveLength(2);

  // A small buffer before reload: Supabase's connection pooler can briefly
  // serve a read from a different backend than the one that just committed
  // the write, so an immediate reload can race a not-yet-visible write even
  // after the client-side "Saved" status has settled.
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(page.getByLabel("Episode title")).toHaveValue("Renamed Episode");
  await expect(page.getByLabel("Episode description")).toHaveValue("New episode description");
  await expect(page.getByRole("strong").filter({ hasText: "Jazzy" })).toBeVisible();
  // The drag-reordered sequence itself — not just that both names are present.
  expect(await castNames.allTextContents()).toEqual(namesAfterDrag);
});

test("avatar upload previews immediately, persists across reload, and renders in the phone preview", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/");
  await expect(page.getByText(/Signed in as/)).toBeVisible();
  await waitForStudioHydration(page);
  await openCharacterEditor(page, 0);

  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: TINY_PNG });

  // Optimistic preview shows immediately, before the upload round-trip resolves.
  await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();

  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saved", { timeout: 10_000 });
  await expect.poll(() => contactAvatarBackground(page)).toContain("/storage/v1/object/public/avatars/");

  // See the comment in the previous test about the connection-pooler read lag.
  await page.waitForTimeout(1500);
  await page.reload();
  await expect.poll(() => contactAvatarBackground(page)).toContain("/storage/v1/object/public/avatars/");
  await openCharacterEditor(page, 0);
  await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
});

test("an exported frame containing an uploaded avatar renders the cross-origin image, not a blank circle", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/");
  await expect(page.getByText(/Signed in as/)).toBeVisible();
  await waitForStudioHydration(page);
  await openCharacterEditor(page, 0);

  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: TINY_PNG });
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saved", { timeout: 10_000 });
  await expect.poll(() => contactAvatarBackground(page)).toContain("/storage/v1/object/public/avatars/");

  // Locate the avatar as a fraction of the phone screen (not raw CSS px):
  // the interactive preview is CSS-scaled and padded differently than the
  // export's off-screen render, but both lay out the same "screen" content
  // at the native device aspect (the default "Tall" export ratio), so the
  // fraction carries over to the exported raster's pixel grid.
  const screenBox = await page
    .getByRole("region", { name: "Message preview" })
    .locator("> div > div")
    .first()
    .boundingBox();
  const avatarBox = await contactAvatarLocator(page).boundingBox();
  if (!screenBox || !avatarBox) throw new Error("could not measure the phone screen or avatar");
  const xFraction = (avatarBox.x + avatarBox.width / 2 - screenBox.x) / screenBox.width;
  const yFraction = (avatarBox.y + avatarBox.height / 2 - screenBox.y) / screenBox.height;

  await page.getByRole("button", { name: "Export", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Export episode" });
  await expect(dialog).toBeVisible();
  const exportButton = dialog.getByRole("button", { name: "Export as PNG" });
  await expect(exportButton).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent("download"), exportButton.click()]);
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("Playwright did not provide a path for the exported PNG");

  const png = PNG.sync.read(await readFile(downloadPath));
  const centerX = Math.round(xFraction * png.width);
  const centerY = Math.round(yFraction * png.height);

  // TINY_PNG is a single fully-opaque black pixel; stretched over the avatar
  // circle (`bg-cover`), a correctly embedded upload reads as solid near-black
  // here. A failed cross-origin embed instead falls back to the character's
  // flat swatch color (bright red/blue/etc — see shared-ui.tsx's `Avatar`),
  // which this radius would never mistake for black.
  const radius = 10;
  let darkPixels = 0;
  let sampled = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = centerX + dx;
      const y = centerY + dy;
      if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue;
      const idx = (png.width * y + x) << 2;
      sampled++;
      if (png.data[idx] < 40 && png.data[idx + 1] < 40 && png.data[idx + 2] < 40) darkPixels++;
    }
  }

  expect(sampled).toBeGreaterThan(0);
  expect(darkPixels / sampled).toBeGreaterThan(0.8);
});

test("avatar upload rejects non-images and oversized files, preserving the original avatar", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/");
  await expect(page.getByText(/Signed in as/)).toBeVisible();
  await waitForStudioHydration(page);
  await openCharacterEditor(page, 0);

  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: TINY_PNG });
  // Poll for the real storage URL rather than the "Saved" status text: status
  // can already read "Saved" from before this upload even started (it only
  // flips to "Saving…" once the debounced write fires), so waiting on it
  // alone can race the upload and capture the stale optimistic blob URL.
  await expect.poll(() => contactAvatarBackground(page), { timeout: 10_000 }).toContain(
    "/storage/v1/object/public/avatars/",
  );
  const originalBackground = await contactAvatarBackground(page);

  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await expect(page.getByText("Please choose an image file.")).toBeVisible();
  await expect.poll(() => contactAvatarBackground(page)).toBe(originalBackground);

  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "big.png", mimeType: "image/png", buffer: Buffer.alloc(2 * 1024 * 1024 + 1) });
  await expect(page.getByText("Image is too large (max 2MB).")).toBeVisible();
  await expect.poll(() => contactAvatarBackground(page)).toBe(originalBackground);
});

test("replacing or removing an avatar actually deletes the old object from storage", async ({
  authenticatedPage: page,
}) => {
  const admin = createAdminClient();

  // Wait on the actual character-row write landing rather than the "Save
  // status" text: that text can already read "Saved" from before a given
  // change even started debouncing (see the "rejects non-images" test
  // above), and separately its "Saving…" window can be too brief for a
  // poll to reliably land inside — the network response is unambiguous.
  function waitForCharacterWrite() {
    return page.waitForResponse(
      (response) => response.url().includes("/rest/v1/characters") && response.request().method() === "POST",
      { timeout: 10_000 },
    );
  }

  await page.goto("/");
  await expect(page.getByText(/Signed in as/)).toBeVisible();
  await waitForStudioHydration(page);
  await openCharacterEditor(page, 0);

  const firstWrite = waitForCharacterWrite();
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: TINY_PNG });
  await firstWrite;
  const firstPath = avatarPathFromBackground(await contactAvatarBackground(page));

  // Replacing the avatar uploads a second (differently-timestamped) object
  // and should eventually delete the first — but only once the row's new
  // avatar_path is confirmed persisted, not eagerly on upload success.
  const secondWrite = waitForCharacterWrite();
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: TINY_PNG });
  await secondWrite;
  const secondPath = avatarPathFromBackground(await contactAvatarBackground(page));
  expect(secondPath).not.toBe(firstPath);

  await expect.poll(() => storageObjectExists(admin, firstPath), { timeout: 10_000 }).toBe(false);
  await expect(storageObjectExists(admin, secondPath)).resolves.toBe(true);

  // Removing the avatar entirely should likewise clean up its object once persisted.
  const removeWrite = waitForCharacterWrite();
  await page.getByRole("button", { name: "Remove" }).click();
  await removeWrite;
  await expect.poll(() => storageObjectExists(admin, secondPath), { timeout: 10_000 }).toBe(false);
});
