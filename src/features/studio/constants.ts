/**
 * Shared layout, timing, and visual constants for the studio module.
 * Pulled out of individual components so values used in more than one
 * place (panel widths, spring configs, bubble colors) can't silently
 * drift apart.
 */

/** Properties panel width, in rem so it follows the studio's fluid density (see `globals.css`). */
export const PANEL_WIDTH = "21.25rem";

/** How long the "Delivered"/"Read" status stays hidden after sending, in ms. */
export const STATUS_DELAY_MS = 1200;

export const KEYBOARD_HEIGHT_OPEN = 291;
export const KEYBOARD_HEIGHT_CLOSED = 24;

export const SPRING_SNAPPY = { type: "spring", stiffness: 400, damping: 25 } as const;
export const SPRING_SOFT = { type: "spring", stiffness: 400, damping: 30 } as const;
export const SPRING_BOUNCE = { type: "spring", bounce: 0.3, duration: 0.5 } as const;

/** Outgoing-bubble gradient endpoints, keyed by bubble color + theme. */
export const BUBBLE_GRADIENTS = {
  blue: { light: { top: "#32ade6", bottom: "#0b93f6" }, dark: { top: "#1d95fe", bottom: "#0a84ff" } },
  green: { light: { top: "#53d769", bottom: "#28cd41" }, dark: { top: "#53d769", bottom: "#28cd41" } },
} as const;

/** Character swatch palette, in assignment order. */
export const CHARACTER_PALETTE = [
  "#ff7a7a",
  "#5aa9e6",
  "#ffb020",
  "#5bc98c",
  "#b07cff",
  "#ff8fc7",
  "#3fc7c9",
  "#f0894e",
  "#9aa0ff",
  "#e0607e",
] as const;

/** Fixed export/preview screen width in CSS px — matches the iOS 375pt design width. */
export const PHONE_SCREEN_WIDTH = 375;

/** Avatar upload size guard, in bytes. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/** Export raster scale (2x = retina). */
export const EXPORT_SCALE = 2;

/** Selectable export frame shapes. Width:height are ratio units, not pixels. */
export const EXPORT_ASPECT_RATIOS = [
  { id: "tall", label: "Tall (9:19.5)", width: 9, height: 19.5 },
  { id: "portrait", label: "Portrait (4:5)", width: 4, height: 5 },
  { id: "classic", label: "Classic (3:4)", width: 3, height: 4 },
  { id: "square", label: "Square (1:1)", width: 1, height: 1 },
] as const;

export type ExportAspectRatioId = (typeof EXPORT_ASPECT_RATIOS)[number]["id"];
