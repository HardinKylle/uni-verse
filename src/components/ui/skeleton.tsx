import { cn } from "@/lib/utils";

/**
 * Decorative placeholder bar for route-level loading states. Hidden from
 * assistive tech — the surrounding loading region announces itself once
 * instead of exposing each bar.
 */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn("rounded-md bg-sand-200/70 motion-safe:animate-pulse", className)}
    />
  );
}
