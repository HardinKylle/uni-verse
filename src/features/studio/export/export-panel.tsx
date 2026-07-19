"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { EXPORT_ASPECT_RATIOS, type ExportAspectRatioId } from "../constants";
import { miniLabel, SegmentedControl } from "../ui/shared-ui";
import { useStudio } from "../studio-context";
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
      <Button
        ref={triggerRef}
        variant="primary"
        size="sm"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onPress={() => setIsOpen((open) => !open)}
      >
        <Download className="size-4" />
        Export
      </Button>

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
                <Button
                  key={ratio.id}
                  variant={effectiveAspectRatio === ratio.id ? "secondary" : "outline"}
                  size="sm"
                  aria-pressed={effectiveAspectRatio === ratio.id}
                  className={cn(
                    effectiveAspectRatio === ratio.id && "border-accent-500 bg-accent-100/60 text-accent-900",
                  )}
                  isDisabled={forceNativeShape || (!isAuthenticated && ratio.id !== EXPORT_ASPECT_RATIOS[0].id)}
                  onPress={() => setAspectRatio(ratio.id)}
                >
                  {ratio.label}
                </Button>
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

            <Button
              variant="primary"
              fullWidth
              isDisabled={frames.length === 0 || isExporting || isPreparing}
              onPress={() => void exportEpisode()}
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
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
