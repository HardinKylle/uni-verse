import { Laptop } from "lucide-react";

/**
 * Shown below the `lg` breakpoint in place of the studio. The editor is built
 * for a laptop- or iPad-sized canvas, so on phones and portrait tablets we ask
 * the reader to switch devices rather than render the cramped, overflowing shell.
 *
 * Pure CSS gate: this is `lg:hidden` and the studio is `hidden lg:flex`, so
 * server and client render the same markup — no width measurement, no flash.
 */
export function SmallScreenNotice() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#F7F3EF] px-6 py-12 text-center font-sans lg:hidden">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-white text-sand-700 shadow-sm ring-1 ring-sand-200/70">
        <Laptop className="size-8" aria-hidden />
      </span>
      <div className="max-w-sm space-y-2">
        <h1 className="font-display text-2xl text-sand-900">
          Kathalis needs a bigger screen
        </h1>
        <p className="text-sm leading-6 text-sand-600">
          The studio is built for a laptop or an iPad. Please open Kathalis on a
          larger screen — or rotate your tablet to landscape — to start writing.
        </p>
      </div>
    </div>
  );
}
