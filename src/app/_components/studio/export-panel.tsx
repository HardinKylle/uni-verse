"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { EXPORT_ASPECT_RATIOS, type ExportAspectRatioId } from "./constants";
import { focusRing, miniLabel, SegmentedControl } from "./shared-ui";
import { useStudio } from "./studio-context";
import { useExport } from "./use-export";

export function ExportButton() {
  const { state, isAuthenticated } = useStudio();
  const [isOpen, setIsOpen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<ExportAspectRatioId>(EXPORT_ASPECT_RATIOS[0].id);
  const [includeBezel, setIncludeBezel] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const forceNativeShape = includeBezel || state.showKeyboard;
  const effectiveAspectRatio = forceNativeShape ? EXPORT_ASPECT_RATIOS[0].id : aspectRatio;

  const { frames, exportFrameCount, isExporting, isPreparing, exportEpisode } = useExport(
    state,
    aspectRatio,
    includeBezel,
    isAuthenticated,
  );

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-lg bg-white/80 backdrop-blur px-3 text-[12.5px] font-medium text-sand-500 shadow-sm ring-1 ring-black/5 transition-colors hover:text-sand-900",
          focusRing,
        )}
      >
        <Download className="size-4" />
        Export
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="Export episode"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-[calc(100%+8px)] right-0 z-50 w-72 rounded-2xl border border-sand-200 bg-white/95 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur-xl"
          >
            <p className={miniLabel}>Frame shape</p>
            <div className="mb-4 grid grid-cols-2 gap-1.5">
              {EXPORT_ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.id}
                  type="button"
                  aria-pressed={effectiveAspectRatio === ratio.id}
                  disabled={forceNativeShape || (!isAuthenticated && ratio.id !== EXPORT_ASPECT_RATIOS[0].id)}
                  onClick={() => setAspectRatio(ratio.id)}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-[11.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    effectiveAspectRatio === ratio.id
                      ? "border-accent-500 bg-accent-100/60 text-accent-900"
                      : "border-sand-200 text-sand-600 hover:bg-sand-50",
                    focusRing,
                  )}
                >
                  {ratio.label}
                </button>
              ))}
            </div>

            {!isAuthenticated ? (
              <p className="-mt-2 mb-4 text-[11px] text-sand-500">
                Sign in to unlock all frame shapes.
              </p>
            ) : null}

            <div className="mb-4">
              <p className={miniLabel}>Frame style</p>
              <SegmentedControl<"screen" | "device">
                label="Frame style"
                value={includeBezel ? "device" : "screen"}
                options={[
                  { value: "screen", label: "Screen only" },
                  { value: "device", label: "Full device" },
                ]}
                onChange={(value) => setIncludeBezel(value === "device")}
                disabled={!isAuthenticated}
              />
            </div>

            <div className="mb-4 flex items-center justify-between rounded-lg bg-sand-50 px-3 py-2">
              <span className="text-[12px] font-medium text-sand-600">Frames</span>
              <span className="font-mono text-[12px] font-semibold text-sand-900">{frames.length}</span>
            </div>

            {!isAuthenticated && frames.length > exportFrameCount ? (
              <p role="status" className="mb-4 rounded-lg bg-accent-100/60 px-3 py-2 text-[11.5px] text-accent-900">
                Only the first {exportFrameCount} of {frames.length} frames will be exported. Sign in to export them all.
              </p>
            ) : null}

            <button
              type="button"
              disabled={frames.length === 0 || isExporting || isPreparing}
              onClick={() => void exportEpisode()}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-accent-600 disabled:pointer-events-none disabled:bg-sand-200 disabled:text-sand-400",
                focusRing,
              )}
            >
              {isExporting || isPreparing ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {isExporting
                ? "Exporting…"
                : isPreparing
                  ? "Preparing…"
                  : frames.length === 0
                    ? "Nothing to export"
                  : frames.length === 1
                    ? "Export as PNG"
                    : `Export ${exportFrameCount} PNGs as ZIP`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
