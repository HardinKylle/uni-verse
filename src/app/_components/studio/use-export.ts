"use client";

import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";

import { downloadBlob } from "@/lib/utils";
import { EXPORT_ASPECT_RATIOS, PHONE_SCREEN_WIDTH, type ExportAspectRatioId } from "./constants";
import { measureContentHeight, prepareMessagesForExport, renderFrameToBlob } from "./export-measure";
import { sliceIntoFrames } from "./export-slicing";
import { computeGroupFlagsMap, getStatusText } from "./phone-preview";
import type { StudioState } from "./types";
import { exportFramesForUser } from "./anonymous-limits";

const NATIVE_RATIO = EXPORT_ASPECT_RATIOS[0];

function ratioTotalHeight(aspectRatio: ExportAspectRatioId, forceNativeShape: boolean): number {
  // Full-device export shows the real phone shape, so the aspect-ratio picker is locked to native there.
  const ratio = forceNativeShape ? NATIVE_RATIO : (EXPORT_ASPECT_RATIOS.find((r) => r.id === aspectRatio) ?? NATIVE_RATIO);
  return Math.round((PHONE_SCREEN_WIDTH * ratio.height) / ratio.width);
}

/** The home-indicator bar only reads as a real screenshot on the native device shape — hidden on cropped ratios. */
function shouldShowHomeIndicator(aspectRatio: ExportAspectRatioId, forceNativeShape: boolean): boolean {
  return forceNativeShape || aspectRatio === NATIVE_RATIO.id;
}

/**
 * The generic "Today 9:41 AM" banner marks the top of the whole thread, so it
 * only belongs on the frame that actually captures message #1 — and even
 * there, not if that frame already opens with a manually-placed timestamp
 * divider, which already does that job and would otherwise double up.
 */
function frameNeedsDayTimeHeader(frameIndex: number, frameMessages: StudioState["messages"]): boolean {
  return frameIndex === 0 && frameMessages[0]?.type !== "timestamp";
}

/**
 * Drives the export panel: keeps a live frame count as aspect ratio / bezel
 * / manual breaks change, and renders + zips + downloads on demand.
 *
 * Message-height measurement is debounced rather than recomputed on every
 * keystroke — it mounts one DOM row per message, and message text changes
 * (typing in the script panel) change `state.messages`' identity on every
 * keystroke.
 */
export function useExport(
  state: StudioState,
  aspectRatio: ExportAspectRatioId,
  includeBezel: boolean,
  isAuthenticated: boolean,
) {
  const [isExporting, setIsExporting] = useState(false);
  // Both measurements touch `document`, so they're populated client-only via
  // effects (never during render) — this page is prerendered on the server,
  // where `document` doesn't exist.
  const [prepared, setPrepared] = useState({
    messages: state.messages,
    heights: new Map<string, number>(),
    sourceMessages: state.messages,
    contentKey: "",
  });
  const [contentHeights, setContentHeights] = useState({ first: 0, continuation: 0, key: "" });

  const forceNativeShape = includeBezel || state.showKeyboard;
  const totalHeight = useMemo(
    () => ratioTotalHeight(aspectRatio, forceNativeShape),
    [aspectRatio, forceNativeShape],
  );
  const showHomeIndicator = useMemo(
    () => shouldShowHomeIndicator(aspectRatio, forceNativeShape),
    [aspectRatio, forceNativeShape],
  );
  const lastMessage = state.messages.at(-1);
  const reserveTrailingStatus = state.status !== "None" && lastMessage?.senderId === state.ownerId;
  const contentKey = `${totalHeight}:${includeBezel}:${showHomeIndicator}:${reserveTrailingStatus}:${state.showKeyboard}`;

  useEffect(() => {
    // Chrome (status bar/header/spacer) height only depends on totalHeight/includeBezel/showHomeIndicator; message content never affects it, so `state` is read fresh without being a dep.
    const timer = setTimeout(
      () =>
        setContentHeights({
          first: measureContentHeight(
            state,
            totalHeight,
            includeBezel,
            showHomeIndicator,
            true,
            reserveTrailingStatus,
          ),
          continuation: measureContentHeight(
            state,
            totalHeight,
            includeBezel,
            showHomeIndicator,
            false,
            reserveTrailingStatus,
          ),
          key: contentKey,
        }),
      0,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalHeight, includeBezel, showHomeIndicator, reserveTrailingStatus, contentKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const maximumMessageHeight = Math.min(contentHeights.first, contentHeights.continuation);
      const result = prepareMessagesForExport(state.messages, maximumMessageHeight);
      setPrepared({
        ...result,
        sourceMessages: state.messages,
        contentKey: contentHeights.key,
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [state.messages, contentHeights]);

  const isReady =
    contentHeights.key === contentKey &&
    prepared.sourceMessages === state.messages &&
    prepared.contentKey === contentKey;
  const preparedMessages = prepared.messages;
  const heights = prepared.heights;

  const frames = useMemo(
    () =>
      sliceIntoFrames(
        preparedMessages,
        state.frameBreaks,
        heights,
        contentHeights.first,
        contentHeights.continuation,
      ),
    [preparedMessages, state.frameBreaks, heights, contentHeights],
  );

  // Computed from the full conversation, not any one frame's slice — see computeGroupFlagsMap's docstring.
  const groupFlags = useMemo(() => computeGroupFlagsMap(preparedMessages), [preparedMessages]);
  const exportFrames = useMemo(
    () => exportFramesForUser(frames, isAuthenticated),
    [frames, isAuthenticated],
  );

  /** A single frame downloads directly as a PNG; multiple frames get zipped so it's one download instead of N. */
  async function exportEpisode() {
    if (frames.length === 0 || isExporting || !isReady) return;

    setIsExporting(true);
    try {
      const lastMessage = state.messages.at(-1);
      const showTrailingStatus = state.status !== "None" && lastMessage?.senderId === state.ownerId;
      const trailingStatusText = showTrailingStatus ? getStatusText(state.status, state.readTime) : null;
      const baseName = state.projectName.trim() || "episode";

      if (frames.length === 1) {
        const blob = await renderFrameToBlob(
          state,
          frames[0],
          groupFlags,
          totalHeight,
          includeBezel,
          showHomeIndicator,
          frameNeedsDayTimeHeader(0, frames[0]),
          trailingStatusText,
        );
        downloadBlob(blob, `${baseName}.png`);
        return;
      }

      const zip = new JSZip();
      const pad = String(exportFrames.length).length;

      for (const [index, frameMessages] of exportFrames.entries()) {
        const isLastFrame = index === frames.length - 1;
        const blob = await renderFrameToBlob(
          state,
          frameMessages,
          groupFlags,
          totalHeight,
          includeBezel,
          showHomeIndicator,
          frameNeedsDayTimeHeader(index, frameMessages),
          isLastFrame ? trailingStatusText : null,
        );
        zip.file(`frame-${String(index + 1).padStart(pad, "0")}.png`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, `${baseName}.zip`);
    } finally {
      setIsExporting(false);
    }
  }

  return { frames, exportFrameCount: exportFrames.length, isExporting, isPreparing: !isReady, exportEpisode };
}
