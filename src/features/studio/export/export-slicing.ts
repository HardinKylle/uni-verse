import type { Message } from "../types";

/**
 * Greedily packs messages into export frames: starts a new frame whenever
 * the next message is a forced `frameBreaks` id, or when adding it would
 * overflow `targetHeight`. A message taller than `targetHeight` on its own
 * still gets exactly one frame (it's never dropped or split).
 *
 * Pure by design — heights are measured elsewhere (DOM-dependent) and
 * injected here so the packing logic itself is cheap to unit test.
 */
export function sliceIntoFrames(
  messages: Message[],
  frameBreaks: string[],
  heights: Map<string, number>,
  firstFrameHeight: number,
  continuationFrameHeight = firstFrameHeight,
): Message[][] {
  if (messages.length === 0) return [];

  const frameBreakSet = new Set(frameBreaks);
  const frames: Message[][] = [];
  let current: Message[] = [];
  let currentHeight = 0;

  for (const message of messages) {
    const targetHeight = frames.length === 0 ? firstFrameHeight : continuationFrameHeight;
    const messageHeight = heights.get(message.id) ?? 0;
    const isForcedBreak = current.length > 0 && frameBreakSet.has(message.id);
    const overflows = current.length > 0 && currentHeight + messageHeight > targetHeight;

    if (isForcedBreak || overflows) {
      frames.push(current);
      current = [];
      currentHeight = 0;
    }

    current.push(message);
    currentHeight += messageHeight;
  }

  frames.push(current);

  return frames;
}
