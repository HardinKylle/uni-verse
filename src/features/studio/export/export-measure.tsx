import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { domToBlob } from "modern-screenshot";

import { EXPORT_SCALE, PHONE_SCREEN_WIDTH } from "../constants";
import {
  MessageBubble,
  TimestampDivider,
  computeGroupFlagsMap,
  messageRowClassName,
  timestampRowClassName,
} from "../phone/phone-preview";
import { PhoneScreen } from "../phone/phone-screen";
import { updateOutgoingBubbleGradient } from "../phone/use-outgoing-bubble-gradient";
import type { Message, StudioState } from "../types";

/**
 * All measurement/rasterization here mounts a real (but off-screen) DOM
 * subtree rather than estimating sizes analytically — `modern-screenshot`
 * and layout-dependent heights both need actual rendered boxes, and this
 * keeps them exactly pixel-identical to what `PhoneScreen`/`PhonePreview`
 * actually render.
 */
function createOffscreenContainer(width: number): HTMLDivElement {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "-99999px";
  container.style.width = `${width}px`;
  container.setAttribute("aria-hidden", "true");
  document.body.appendChild(container);
  return container;
}

function MeasureRows({ messages }: { messages: Message[] }) {
  const groupFlags = computeGroupFlagsMap(messages);

  return (
    <div className="font-ios">
      {messages.map((message) => {
        if (message.type === "timestamp") {
          return (
            <div key={message.id} data-measure-id={message.id} className={timestampRowClassName}>
              <TimestampDivider text={message.text} />
            </div>
          );
        }

        const { firstInGroup, lastInGroup } = groupFlags.get(message.id) ?? { firstInGroup: true, lastInGroup: true };
        return (
          <div key={message.id} data-measure-id={message.id} className={messageRowClassName(false, firstInGroup)}>
            <MessageBubble message={message} mine={false} gradient={{ top: "#000", bottom: "#000" }} showTail={lastInGroup} />
          </div>
        );
      })}
    </div>
  );
}

/** Per-message rendered height (row + its own margin), keyed by message id, at the fixed export width. */
export function measureMessageHeights(messages: Message[]): Map<string, number> {
  if (messages.length === 0) return new Map();

  const container = createOffscreenContainer(PHONE_SCREEN_WIDTH);
  const root = createRoot(container);
  flushSync(() => root.render(<MeasureRows messages={messages} />));

  const rowEls = Array.from(container.querySelectorAll<HTMLElement>("[data-measure-id]"));
  const heights = new Map<string, number>();
  rowEls.forEach((el) => {
    const id = el.dataset.measureId as string;
    const styles = getComputedStyle(el);
    const outerHeight =
      el.getBoundingClientRect().height +
      Number.parseFloat(styles.marginTop || "0") +
      Number.parseFloat(styles.marginBottom || "0");
    heights.set(id, Math.ceil(outerHeight));
  });

  root.unmount();
  container.remove();

  return heights;
}

/**
 * Splits only bubbles that cannot fit in the selected frame's message area.
 * The editor state is not changed: synthetic ids/text exist solely in the
 * export render. Character-level binary search also handles long unbroken
 * strings, while preferring a nearby whitespace boundary for normal prose.
 */
export function prepareMessagesForExport(
  messages: Message[],
  maximumMessageHeight: number,
): { messages: Message[]; heights: Map<string, number> } {
  const originalHeights = measureMessageHeights(messages);
  if (maximumMessageHeight <= 0) return { messages, heights: originalHeights };

  const prepared: Message[] = [];

  for (const message of messages) {
    const originalHeight = originalHeights.get(message.id) ?? 0;
    if (originalHeight <= maximumMessageHeight) {
      prepared.push(message);
      continue;
    }

    let remaining = message.text;
    let part = 0;
    while (remaining.length > 0) {
      const id = part === 0 ? message.id : `${message.id}--export-part-${part + 1}`;
      const wholeCandidate = { ...message, id, text: remaining };
      const wholeHeight = measureMessageHeights([wholeCandidate]).get(id) ?? 0;
      if (wholeHeight <= maximumMessageHeight) {
        prepared.push(wholeCandidate);
        break;
      }

      let low = 1;
      let high = remaining.length;
      let best = 1;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const candidate = { ...message, id, text: remaining.slice(0, middle) };
        const height = measureMessageHeights([candidate]).get(id) ?? 0;
        if (height <= maximumMessageHeight) {
          best = middle;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }

      const prefix = remaining.slice(0, best);
      const whitespaceIndex = Math.max(prefix.lastIndexOf(" "), prefix.lastIndexOf("\n"));
      const splitAt = whitespaceIndex > best / 2 ? whitespaceIndex + 1 : best;
      const text = remaining.slice(0, splitAt).trimEnd();
      prepared.push({ ...message, id, text: text || remaining.slice(0, best) });
      remaining = remaining.slice(splitAt).trimStart();
      part += 1;
    }
  }

  return { messages: prepared, heights: measureMessageHeights(prepared) };
}

/**
 * Height left for the message column once the status bar, header, and
 * bottom spacer are laid out. When requested, reserves space for the trailing
 * "Delivered"/"Read" status row so it cannot overflow the final frame.
 */
export function measureContentHeight(
  state: StudioState,
  totalHeight: number,
  includeBezel: boolean,
  showHomeIndicator: boolean,
  showDayTimeHeader: boolean,
  reserveTrailingStatus: boolean,
): number {
  const container = createOffscreenContainer(PHONE_SCREEN_WIDTH);
  const root = createRoot(container);
  flushSync(() =>
    root.render(
      <PhoneScreen
        state={state}
        messages={[]}
        height={totalHeight}
        includeBezel={includeBezel}
        showHomeIndicator={showHomeIndicator}
        showDayTimeHeader={showDayTimeHeader}
        trailingStatusText={reserveTrailingStatus ? " " : null}
      />,
    ),
  );

  const slot = container.querySelector<HTMLElement>("[data-content-slot]");
  const reservedHeight = Array.from(
    container.querySelectorAll<HTMLElement>("[data-reserved-row]"),
  ).reduce((total, row) => {
    const styles = getComputedStyle(row);
    return (
      total +
      row.getBoundingClientRect().height +
      Number.parseFloat(styles.marginTop || "0") +
      Number.parseFloat(styles.marginBottom || "0")
    );
  }, 0);
  const height = Math.max(0, (slot?.clientHeight ?? 0) - Math.ceil(reservedHeight));

  root.unmount();
  container.remove();

  return height;
}

/** Rasterizes one export frame to a PNG blob at `EXPORT_SCALE`. */
export async function renderFrameToBlob(
  state: StudioState,
  frameMessages: Message[],
  groupFlags: Map<string, { firstInGroup: boolean; lastInGroup: boolean }>,
  totalHeight: number,
  includeBezel: boolean,
  showHomeIndicator: boolean,
  showDayTimeHeader: boolean,
  trailingStatusText: string | null,
): Promise<Blob> {
  const width = includeBezel ? PHONE_SCREEN_WIDTH + 16 : PHONE_SCREEN_WIDTH;
  const height = includeBezel ? totalHeight + 16 : totalHeight;

  const container = createOffscreenContainer(width);
  const root = createRoot(container);
  flushSync(() =>
    root.render(
      <PhoneScreen
        state={state}
        messages={frameMessages}
        groupFlags={groupFlags}
        height={totalHeight}
        includeBezel={includeBezel}
        showHomeIndicator={showHomeIndicator}
        showDayTimeHeader={showDayTimeHeader}
        trailingStatusText={trailingStatusText}
      />,
    ),
  );

  try {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const target = container.firstElementChild as HTMLElement;
    const messageArea = target.querySelector<HTMLElement>("[data-content-slot]");
    if (messageArea) updateOutgoingBubbleGradient(messageArea);
    return await domToBlob(target, {
      width,
      height,
      scale: EXPORT_SCALE,
      backgroundColor: includeBezel ? "#0b0b0c" : state.dark ? "#000000" : "#ffffff",
      // The export subtree uses system/iOS font fallbacks. Re-embedding every
      // app font into each foreign-object SVG makes repeated captures flaky
      // in Chromium and has no visual benefit here.
      font: false,
    });
  } finally {
    root.unmount();
    container.remove();
  }
}
