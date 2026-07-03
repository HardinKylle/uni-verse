/**
 * Merge conditional class names, skipping falsy values.
 * Small, dependency-free stand-in for `clsx` until a real need for the
 * package (e.g. Tailwind class conflict resolution) exists.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
