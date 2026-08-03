import { Skeleton } from "@/components/ui/skeleton";
import { PANEL_WIDTH, PHONE_SCREEN_WIDTH } from "./constants";
import { SmallScreenNotice } from "./ui/small-screen-notice";

/**
 * Instant loading state for /p/[projectId]. Mirrors the Studio shell —
 * header bar, editor panel with sidebar, phone preview, properties panel
 * (open by default) — so the loaded workspace swaps in without layout shift.
 */
export function StudioSkeleton() {
  return (
    <>
      <SmallScreenNotice />
      <main
        aria-busy="true"
        className="hidden h-screen flex-col overflow-hidden bg-[#F7F3EF] text-foreground font-sans text-sm p-3 gap-2 lg:flex"
      >
      <p role="status" className="sr-only">
        Loading your story…
      </p>

      <header className="flex shrink-0 items-center justify-between rounded-2xl border border-sand-200/70 bg-white py-3 pl-4 pr-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="font-display text-xl leading-none text-sand-900">
            Kathalis<span className="text-accent-500">.</span>
          </span>
          <div aria-hidden className="h-5 w-px bg-sand-200" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-72 rounded-lg" />
          <Skeleton className="size-9 rounded-lg" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex min-w-0 flex-1 overflow-hidden rounded-2xl border border-sand-200/70 bg-white">
          <div className="h-full w-[288px] shrink-0 border-r border-sand-100 px-5 pt-5 2xl:w-[340px]">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-3 h-4 w-32" />
            <div className="mt-8 space-y-2">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
          </div>
          <div className="min-w-0 flex-1 px-5 pt-7">
            <Skeleton className="h-4 w-28" />
            <div className="mt-6 space-y-4">
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={row} className={row % 2 ? "ml-auto h-9 w-3/5 rounded-xl" : "h-9 w-3/5 rounded-xl"} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5">
          <Skeleton className="h-4/5 rounded-[3rem]" style={{ width: PHONE_SCREEN_WIDTH }} />
        </div>

        <div
          className="shrink-0 overflow-hidden rounded-2xl border border-sand-200/70 bg-white px-5 pt-7"
          style={{ width: PANEL_WIDTH }}
        >
          <Skeleton className="h-4 w-32" />
          <div className="mt-6 space-y-3">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </div>
        </div>
      </main>
    </>
  );
}
