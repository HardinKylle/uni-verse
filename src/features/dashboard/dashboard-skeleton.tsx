import { Skeleton } from "@/components/ui/skeleton";
import { BrandLogo } from "@/components/brand-logo";

/**
 * Instant loading state for /dashboard. Mirrors the Dashboard layout —
 * static chrome renders as real text, data-dependent regions as skeleton
 * bars — so the loaded page swaps in without layout shift.
 */
export function DashboardSkeleton() {
  return (
    <main aria-busy="true" className="min-h-screen bg-[#F7F3EF] text-sand-900">
      <p role="status" className="sr-only">
        Loading your stories…
      </p>

      <header className="border-b border-sand-200/80 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <BrandLogo />
          <div className="flex items-center gap-3">
            <Skeleton className="hidden h-4 w-40 sm:block" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col gap-5 border-b border-sand-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-accent-600">Your library</p>
            <h1 className="mt-2 font-display text-4xl text-sand-900 sm:text-5xl">Stories</h1>
          </div>
          <Skeleton className="h-11 w-32 self-start rounded-lg sm:self-auto" />
        </div>

        <div className="divide-y divide-sand-200">
          {[0, 1, 2].map((row) => (
            <div key={row} className="py-6 pr-24 sm:py-7 sm:pr-28">
              <Skeleton className="h-7 w-64 max-w-full" />
              <Skeleton className="mt-3 h-4 w-96 max-w-full" />
              <Skeleton className="mt-4 h-3 w-44 max-w-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
