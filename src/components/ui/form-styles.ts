import { cn } from "@/lib/utils";

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-1 focus-visible:border-transparent";

export const standardInput = cn(
  "w-full rounded-md border border-transparent bg-transparent px-2.5 py-1.5 text-[0.8125rem] text-sand-900 placeholder:text-sand-400 transition-colors hover:bg-sand-100/80 focus:bg-white focus:ring-1 focus:ring-sand-200 focus:shadow-sm focus:outline-none",
);

export const miniLabel = "mb-2 block font-mono text-[0.5938rem] font-medium tracking-[0.05em] text-sand-500 uppercase";
