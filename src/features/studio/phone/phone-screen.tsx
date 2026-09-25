import { cn } from "@/lib/utils";

import {
  BUBBLE_GRADIENTS,
  KEYBOARD_HEIGHT_CLOSED,
  KEYBOARD_HEIGHT_OPEN,
  PHONE_SCREEN_WIDTH,
} from "../constants";
import {
  ConversationHeader,
  HomeIndicator,
  IosKeyboard,
  MessageBubble,
  StatusBar,
  TimestampDivider,
  darkTheme,
  getMessageGroupFlags,
  getOwnerAndContact,
  lightTheme,
  messageRowClassName,
  timestampRowClassName,
  type GroupFlags,
} from "./phone-preview";
import type { Message, StudioState } from "../types";

/**
 * A static, non-animated render of one phone screen's worth of messages —
 * the export counterpart to the live, scrolling `PhonePreview`. Used both to
 * measure message heights (mounted off-screen) and to rasterize each export
 * frame, so the two must stay pixel-identical to the live preview's chrome.
 */
export function PhoneScreen({
  state,
  messages,
  groupFlags,
  width = PHONE_SCREEN_WIDTH,
  height,
  includeBezel = false,
  showHomeIndicator = true,
  showDayTimeHeader = true,
  trailingStatusText,
}: {
  state: StudioState;
  messages: Message[];
  /**
   * Grouping flags keyed by message id, precomputed from the *whole*
   * conversation (see `computeGroupFlagsMap`). Falls back to grouping within
   * just this `messages` slice if omitted — correct for a full, unsliced
   * conversation, but export frames must always pass the full-conversation
   * map so a frame's leading message doesn't render taller than it measured.
   */
  groupFlags?: Map<string, GroupFlags>;
  width?: number;
  height: number;
  includeBezel?: boolean;
  /** The home-indicator bar only reads as authentic on the native device shape — hide it on cropped aspect ratios. */
  showHomeIndicator?: boolean;
  /** The "Today 9:41 AM" banner marks the top of the thread — only the first export frame is actually there. */
  showDayTimeHeader?: boolean;
  trailingStatusText?: string | null;
}) {
  const { contact } = getOwnerAndContact(state);
  const gradient = BUBBLE_GRADIENTS[state.bubbleColor][state.dark ? "dark" : "light"];

  const screen = (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden bg-[var(--screen-bg)] font-ios text-[var(--header-text)]",
        state.dark ? darkTheme : lightTheme,
        state.bubbleColor === "green" && "[--outgoing:#28cd41]",
        includeBezel && "rounded-[42px]",
      )}
      style={{
        width,
        height,
        // Keep detached export captures opaque even if the rasterizer resolves
        // CSS custom-property backgrounds before their theme class is cloned.
        backgroundColor: state.dark ? "#000000" : "#ffffff",
      }}
      data-bubble={state.bubbleColor}
      data-theme={state.dark ? "dark" : "light"}
    >
      <StatusBar time={state.time} />
      <ConversationHeader contact={contact} inbox={state.inbox} />

      <div data-content-slot className="min-h-0 flex-1 overflow-hidden bg-[var(--screen-bg)] py-1.5 pb-2">
        {showDayTimeHeader ? (
          <div data-reserved-row className="mt-1 mb-2.5 text-center text-[10px] tracking-[-0.1px] text-[var(--subtle)]">
            <strong className="font-normal text-[color-mix(in_srgb,var(--header-text)_58%,transparent)]">{state.day}</strong> {state.time} {state.meridiem}
          </div>
        ) : null}

        <div data-messages-slot>
          {messages.map((message, index) => {
            if (message.type === "timestamp") {
              return (
                <div key={message.id} className={timestampRowClassName}>
                  <TimestampDivider text={message.text} />
                </div>
              );
            }

            const mine = message.senderId === state.ownerId;
            const { firstInGroup, lastInGroup } = groupFlags?.get(message.id) ?? getMessageGroupFlags(messages, index);

            return (
              <div key={message.id} className={messageRowClassName(mine, firstInGroup)}>
                <MessageBubble message={message} mine={mine} gradient={gradient} showTail={lastInGroup} />
              </div>
            );
          })}
        </div>

        {trailingStatusText ? (
          <div data-reserved-row className="flex justify-end px-4 pt-[3px] pb-0.5 text-[10px] font-normal text-[var(--subtle)]">
            <div className="flex w-full justify-end">{trailingStatusText}</div>
          </div>
        ) : null}
      </div>

      {state.showKeyboard ? (
        <>
          <div className="w-full shrink-0" style={{ height: KEYBOARD_HEIGHT_OPEN }} />
          <IosKeyboard animated={false} showHomeIndicator={showHomeIndicator} />
        </>
      ) : showHomeIndicator ? (
        <div className="relative z-10 w-full shrink-0 bg-[var(--screen-bg)]" style={{ height: KEYBOARD_HEIGHT_CLOSED }}>
          <HomeIndicator />
        </div>
      ) : null}
    </div>
  );

  if (!includeBezel) return screen;

  return (
    <div
      className="relative shrink-0 origin-center rounded-[50px] bg-[#0b0b0c] p-[8px] shadow-[0_34px_70px_-24px_rgba(0,0,0,0.55),inset_0_0_0_2px_#26262a]"
      style={{ width: width + 16, height: height + 16 }}
    >
      {screen}
    </div>
  );
}
