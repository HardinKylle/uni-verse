/**
 * Merge conditional class names, skipping falsy values.
 * Small, dependency-free stand-in for `clsx` until a real need for the
 * package (e.g. Tailwind class conflict resolution) exists.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Triggers a browser download for a Blob via a temporary, invisible anchor click. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
