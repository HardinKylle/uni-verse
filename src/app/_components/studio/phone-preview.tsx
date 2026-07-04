"use client";

import { useEffect, useRef, memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";

import { Avatar, focusRingOutline } from "./shared-ui";
import { useStudio } from "./studio-context";
import { useOutgoingBubbleGradient } from "./use-outgoing-bubble-gradient";
import { BUBBLE_GRADIENTS, KEYBOARD_HEIGHT_CLOSED, KEYBOARD_HEIGHT_OPEN, STATUS_DELAY_MS, SPRING_SNAPPY, SPRING_SOFT } from "./constants";
import type { Character, Message, StudioState } from "./types";

export const lightTheme = "[--screen-bg:#fff] [--header-bg:rgba(248,248,248,0.86)] [--header-text:#000] [--subtle:#8e8e93] [--incoming:#e9e9eb] [--incoming-text:#000] [--outgoing:#0b93f6] [--divider:rgba(60,60,67,0.16)] [--field:#fff] [--field-border:#d9d9de] [--home:#000] [--plus-bg:#eaeaea] [--kb-bg:#d1d3d9] [--key-bg:#fff] [--key-text:#000] [--key-shadow:rgba(0,0,0,0.3)] [--special-key:#b4b8c1]";
export const darkTheme = "[--screen-bg:#000] [--header-bg:rgba(24,24,26,0.82)] [--header-text:#fff] [--subtle:#98989f] [--incoming:#262629] [--incoming-text:#fff] [--outgoing:#0a84ff] [--divider:rgba(120,120,128,0.34)] [--field:#1c1c1e] [--field-border:#2e2e31] [--home:#fff] [--plus-bg:#1c1c1e] [--kb-bg:#161618] [--key-bg:#3b3b3d] [--key-text:#fff] [--key-shadow:rgba(0,0,0,1)] [--special-key:#2c2c2e]";

/** Grouping flags for consecutive same-sender bubbles, shared by the live preview and the static export renderer. */
export function getMessageGroupFlags(messages: Message[], index: number) {
  const message = messages[index];
  const previous = messages[index - 1];
  const next = messages[index + 1];
  const firstInGroup = !previous || previous.senderId !== message.senderId || previous.type === "timestamp";
  const lastInGroup = !next || next.senderId !== message.senderId || next.type === "timestamp";
  return { firstInGroup, lastInGroup };
}

export type GroupFlags = { firstInGroup: boolean; lastInGroup: boolean };

/**
 * Precomputes grouping flags from the *whole* conversation, keyed by message id.
 * Export frames render a slice of the conversation, but grouping (and the
 * margin it drives) must stay based on the full conversation — otherwise a
 * message that measures as a tight group-continuation could land at the top
 * of a frame and render taller as a group-start, throwing off that frame's
 * height budget.
 */
export function computeGroupFlagsMap(messages: Message[]): Map<string, GroupFlags> {
  const map = new Map<string, GroupFlags>();
  messages.forEach((message, index) => {
    map.set(message.id, getMessageGroupFlags(messages, index));
  });
  return map;
}

export function getStatusText(status: StudioState["status"], readTime: string): string {
  return status === "Read" && readTime.trim() ? `Read ${readTime.trim()}` : status;
}

/** Owner (device holder) + contact (header subject), shared by the live preview and the static export renderer. */
export function getOwnerAndContact(state: Pick<StudioState, "characters" | "ownerId">) {
  const characterById = new Map(state.characters.map((character) => [character.id, character]));
  const owner = characterById.get(state.ownerId) ?? state.characters[0];
  const contact = state.characters.find(({ id }) => id !== owner.id) ?? state.characters[0];
  return { owner, contact };
}

export function PhonePreview() {
  const { state } = useStudio();
  const { owner, contact } = getOwnerAndContact(state);
  const lastMessage = state.messages.at(-1);
  const lastMessageId = lastMessage?.id;

  // The delivery/read status label appears immediately for whatever the last
  // message was on mount, but is delayed a beat for any message sent after
  // that (so it doesn't pop in alongside the bubble itself).
  const [statusReadyForId, setStatusReadyForId] = useState<string | null>(() => lastMessage?.id ?? null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (lastMessage?.senderId !== owner.id || !lastMessageId) return;

    const timer = setTimeout(() => setStatusReadyForId(lastMessageId), STATUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [lastMessageId, owner.id, lastMessage?.senderId]);

  const showStatus =
    state.status !== "None" && lastMessage?.senderId === owner.id && statusReadyForId === lastMessageId;
  // True only while a status is going to show but hasn't yet (mid-delay) — as
  // opposed to no status being configured at all (state.status === "None").
  const isStatusPending =
    state.status !== "None" && lastMessage?.senderId === owner.id && statusReadyForId !== lastMessageId;
  const statusText = getStatusText(state.status, state.readTime);

  const isOwnerTyping = state.activeSenderId === owner.id && state.draft.trim() !== "";
  const isContactTyping = state.activeSenderId !== owner.id && state.draft.trim() !== "";

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      if (typeof scrollRef.current.scrollTo === "function") {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth"
        });
      } else {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [state.messages.length, state.dark, state.showKeyboard, isContactTyping]);

  useOutgoingBubbleGradient(scrollRef);

  return (
    <section className="relative flex h-full min-w-0 flex-1 items-center justify-center overflow-auto bg-sand-50 bg-[linear-gradient(to_right,#77334412_1px,transparent_1px),linear-gradient(to_bottom,#77334412_1px,transparent_1px)] bg-[size:24px_24px] p-7" aria-label="Message preview">
      <div className="relative h-[812px] w-[375px] shrink-0 origin-center scale-[0.85] rounded-[50px] bg-[#0b0b0c] p-[8px] shadow-[0_34px_70px_-24px_rgba(0,0,0,0.55),inset_0_0_0_2px_#26262a] transition-transform">
        <div
          className={cn("relative flex h-full flex-col overflow-hidden rounded-[42px] bg-[var(--screen-bg)] font-['SF_Pro_Text'] text-[var(--header-text)] transition-colors duration-250", state.dark ? darkTheme : lightTheme, state.bubbleColor === "green" && "[--outgoing:#28cd41]")}
          data-bubble={state.bubbleColor}
          data-theme={state.dark ? "dark" : "light"}
        >
          <StatusBar time={state.time} />
          <ConversationHeader contact={contact} inbox={state.inbox} />

          <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--screen-bg)] py-1.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:w-0">
            <div className="mt-1 mb-2.5 text-center text-[10px] tracking-[-0.1px] text-[var(--subtle)]">
              <strong className="font-normal text-[color-mix(in_srgb,var(--header-text)_58%,transparent)]">{state.day}</strong> {state.time} {state.meridiem}
            </div>

            <div>
              <MessageList
                messages={state.messages}
                ownerId={owner.id}
                isContactTyping={isContactTyping}
                showStatus={showStatus}
                statusText={statusText}
                isStatusPending={isStatusPending}
                bubbleColor={state.bubbleColor}
                isDark={state.dark}
              />
            </div>
          </div>

          <MessageInput draft={state.draft} isOwnerTyping={isOwnerTyping} />
          <motion.div
            initial={false}
            animate={{ height: state.showKeyboard ? KEYBOARD_HEIGHT_OPEN : KEYBOARD_HEIGHT_CLOSED }}
            transition={SPRING_SOFT}
            className="w-full shrink-0 bg-[var(--screen-bg)] z-10 relative overflow-hidden"
          >
            <motion.div
              initial={false}
              animate={{ opacity: state.showKeyboard ? 0 : 1 }}
              transition={{ duration: 0.1 }}
              className="absolute bottom-[8px] left-1/2 h-[5px] w-[135px] -translate-x-1/2 rounded-[3px] bg-[var(--home)] opacity-92"
            />
          </motion.div>

          <AnimatePresence>
            {state.showKeyboard && <IosKeyboard key="keyboard" />}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

const BUBBLE_TAIL_PATH =
  "M16.8869 20.1846C11.6869 20.9846 6.55352 18.1212 4.88685 16.2879C6.60472 12.1914 -4.00107 2.24186 2.99893 2.24148C4.61754 2.24148 6 -1.9986 11.8869 1.1846C11.9081 2.47144 11.8869 6.92582 11.8869 7.6842C11.8869 18.1842 17.8869 19.5813 16.8869 20.1846Z";

export function BubbleTail({ mine }: { mine: boolean }) {
  if (mine) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 17 21"
        className="absolute bottom-[-1px] right-[-4.3px] h-[18px] w-[15px]"
        fill="none"
        style={{ color: "color-mix(in srgb, var(--grad-top) var(--percent-top, 0%), var(--grad-bottom))" }}
      >
        <path d={BUBBLE_TAIL_PATH} fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 17 21"
      className="absolute bottom-[-1px] h-[18px] w-[15px] left-[-4.3px] -scale-x-100 text-[var(--incoming)]"
    >
      <path d={BUBBLE_TAIL_PATH} fill="currentColor" />
    </svg>
  );
}

/** The iOS home-indicator bar — shared by the collapsed keyboard spacer and the open keyboard. */
export function HomeIndicator({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("absolute bottom-[8px] left-1/2 h-[5px] w-[135px] -translate-x-1/2 rounded-[3px] bg-[var(--home)] opacity-92", className)}
    />
  );
}

export function StatusBar({ time }: { time: string }) {
  return (
    <div className="relative flex h-[52px] shrink-0 items-start justify-between bg-[var(--header-bg)] px-[30px]">
      <span className="mt-[15px] text-sm font-medium tracking-[0.2px] text-[var(--header-text)]">{time}</span>
      <div className="absolute top-[11px] left-1/2 h-[34px] w-[118px] -translate-x-1/2 rounded-[20px] bg-black" />
      <div className="mt-[17px] flex items-center gap-1.5 text-[var(--header-text)]" aria-hidden="true">
        <SignalIcon />
        <WifiIcon />
        <BatteryIcon />
      </div>
    </div>
  );
}

export function ConversationHeader({ contact, inbox }: { contact: Character; inbox: number | "" }) {
  return (
    <div className="relative shrink-0 border-b border-[var(--divider)] bg-[var(--header-bg)] px-3 pt-2 pb-2.5 backdrop-blur-[18px]">
      <button type="button" className={cn("absolute top-[15px] left-1.5 flex cursor-pointer items-center gap-0.5 border-0 bg-transparent p-1 text-[var(--outgoing)]", focusRingOutline)} aria-label="Back to conversations">
        <ChevronLeftIcon />
        {inbox !== "" && (
          <span className="flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[var(--outgoing)] px-1.5 font-['SF_Pro_Text'] text-[11px] font-normal leading-none tracking-[-0.02em] text-white">
            {inbox}
          </span>
        )}
      </button>
      <button type="button" className={cn("absolute top-[19px] right-4 cursor-pointer border-0 bg-transparent text-[var(--outgoing)]", focusRingOutline)} aria-label="Start video call">
        <VideoIcon />
      </button>
      <div className="flex flex-col items-center gap-1">
        <Avatar character={contact} size="large" />
        <div className="flex items-center gap-[3px] text-[var(--subtle)]">
          <span className="text-[11.5px] font-normal text-[var(--header-text)]">{contact.name}</span>
          <ChevronDownIcon />
        </div>
      </div>
    </div>
  );
}

function MessageInput({ draft, isOwnerTyping }: { draft: string; isOwnerTyping: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-2 bg-[var(--screen-bg)] px-3 pt-1.5 pb-2 z-10 relative">
      <button type="button" className={cn("flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--plus-bg)] p-0 text-[var(--subtle)]", focusRingOutline)} aria-label="Add attachment">
        <PlusIcon />
      </button>
      <div className="flex min-h-[35px] flex-1 min-w-0 items-center rounded-[18px] border border-[var(--field-border)] bg-[var(--field)] py-[5px] pr-1.5 pl-3.5">
        <span className={cn("flex-1 min-w-0 text-[15px] font-light truncate mr-2", isOwnerTyping ? "text-[var(--header-text)]" : "text-[var(--subtle)]")}>
          {isOwnerTyping ? draft : "iMessage"}
        </span>
        {isOwnerTyping ? (
          <button type="button" className={cn("flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 p-0 transition-colors duration-200 bg-[var(--outgoing)] text-white", focusRingOutline)} aria-label="Send message">
            <SendIcon />
          </button>
        ) : (
          <button type="button" className={cn("flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 p-0 transition-colors duration-200 bg-transparent text-[var(--subtle)]", focusRingOutline)} aria-label="Record voice message">
            <InputMicIcon />
          </button>
        )}
      </div>
    </div>
  );
}

function TypingBubble() {
  const dotVariants = {
    initial: { y: 0, opacity: 0.4 },
    animate: {
      y: [0, -4, 0, 0],
      opacity: [0.4, 1, 0.4, 0.4]
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95, originX: 0, originY: 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING_SNAPPY}
      className="flex px-3.5 justify-start mt-0.5 mb-1"
    >
      <div className="relative rounded-[18px] px-[14px] py-[10px] bg-[var(--incoming)] flex items-center justify-center gap-[4px] h-[36px]">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            variants={dotVariants}
            initial="initial"
            animate="animate"
            transition={{
              repeat: Infinity,
              duration: 1.4,
              times: [0, 0.2, 0.4, 1],
              delay: i * 0.2,
              ease: "easeInOut"
            }}
            className="size-[6px] rounded-full bg-[var(--subtle)]"
          />
        ))}
        <BubbleTail mine={false} />
      </div>
    </motion.div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg aria-hidden="true" width="12" height="20" viewBox="0 0 12 20" fill="none">
      <path d="M10 1 2 10l8 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="text-[#c7c7cc]" aria-hidden="true" width="6" height="10" viewBox="0 0 6 10">
      <path d="m1 1 4 4-4 4" stroke="currentColor" strokeWidth="1.35" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg aria-hidden="true" width="29" height="22" viewBox="0 0 29 22" fill="none">
      <rect x="1.25" y="3.25" width="18.5" height="15.5" rx="2.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="m21.75 7.15 3.72-2.08c.57-.32 1.28.09 1.28.75v10.36c0 .66-.71 1.07-1.28.75l-3.72-2.08v-7.7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function SignalIcon() {
  return (
    <svg aria-hidden="true" className="overflow-visible" width="18" height="12" viewBox="0 0 18 12">
      <rect y="8" width="3" height="4" rx="1" fill="currentColor" />
      <rect x="5" y="5" width="3" height="7" rx="1" fill="currentColor" />
      <rect x="10" y="2.5" width="3" height="9.5" rx="1" fill="currentColor" />
      <rect x="15" width="3" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg className="overflow-visible" aria-hidden="true" width="17" height="12" viewBox="0 0 17 12">
      <path d="M1.4 3.85a10.8 10.8 0 0 1 14.2 0M4.15 6.75a6.7 6.7 0 0 1 8.7 0" stroke="currentColor" strokeWidth="2.3" fill="none" strokeLinecap="round" />
      <circle cx="8.5" cy="10.15" r="1.5" fill="currentColor" />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg aria-hidden="true" className="overflow-visible" width="25" height="12" viewBox="0 0 25 12">
      <rect x=".5" y=".5" width="21" height="11" rx="3" stroke="currentColor" fill="none" opacity=".4" />
      <rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor" />
      <rect x="23" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 15 15">
      <path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 15 15">
      <path d="M7.5 12.5V3M3.5 7l4-4 4 4" stroke="currentColor" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IosKeyboard({ animated = true, showHomeIndicator = true }: { animated?: boolean; showHomeIndicator?: boolean }) {
  const row1 = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"];
  const row2 = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
  const row3 = ["Z", "X", "C", "V", "B", "N", "M"];

  return (
    <motion.div
      aria-hidden="true"
      initial={animated ? { y: "100%" } : false}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={SPRING_SOFT}
      className="absolute bottom-0 left-0 flex flex-col justify-between bg-[var(--kb-bg)] pb-[20px] pt-[10px] px-1 w-full shrink-0 z-20 font-['SF_Pro_Text'] select-none h-[291px]"
    >
      <div className="flex justify-center gap-[5px]">
        {row1.map((k) => (
          <Key key={k}>{k}</Key>
        ))}
      </div>
      <div className="flex justify-center gap-[5px]">
        {row2.map((k) => (
          <Key key={k}>{k}</Key>
        ))}
      </div>
      <div className="flex justify-center gap-[5px]">
        <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[5px] bg-white text-black shadow-[0_1px_0_var(--key-shadow)]">
          <ShiftIconActive />
        </div>
        {row3.map((k) => (
          <Key key={k}>{k}</Key>
        ))}
        <SpecialKey width="42px">
          <DeleteIcon />
        </SpecialKey>
      </div>
      <div className="flex justify-center gap-[5px]">
        <SpecialKey width="88px">123</SpecialKey>
        <div className="flex-1 max-w-[180px]">
          <Key width="100%" fontSize="15px">space</Key>
        </div>
        <SpecialKey width="88px">return</SpecialKey>
      </div>

      <div className="relative h-[34px] flex items-center justify-between px-4 text-[var(--header-text)]">
        <EmojiIcon />
        <MicIcon />
      </div>

      {showHomeIndicator ? <HomeIndicator /> : null}
    </motion.div>
  );
}

function Key({ children, width = "31.5px", fontSize = "23px" }: { children: React.ReactNode; width?: string; fontSize?: string }) {
  return (
    <div
      className="flex h-[42px] items-center justify-center rounded-[5px] bg-[var(--key-bg)] font-light text-[var(--key-text)] shadow-[0_1px_0_var(--key-shadow)]"
      style={{ width, fontSize }}
    >
      {children}
    </div>
  );
}

function SpecialKey({ children, width }: { children: React.ReactNode; width: string }) {
  return (
    <div
      className="flex h-[42px] shrink-0 items-center justify-center rounded-[5px] bg-[var(--special-key)] text-[15px] font-normal text-[var(--key-text)] shadow-[0_1px_0_var(--key-shadow)]"
      style={{ width }}
    >
      {children}
    </div>
  );
}

function ShiftIconActive() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3L4 11h4v8h8v-8h4l-8-8z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg aria-hidden="true" width="29" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
      <path d="M18 9l-6 6M12 9l6 6" />
    </svg>
  );
}

function EmojiIcon() {
  return (
    <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
      <circle cx="12" cy="12" r="10.25" />
      <g fill="currentColor" stroke="none">
        <circle cx="8.4" cy="9.4" r="1.4" />
        <circle cx="15.6" cy="9.4" r="1.4" />
        <path d="M7 13 Q12 13.8 17 13 A5.6 4.2 0 0 1 7 13 Z" />
      </g>
    </svg>
  );
}

function MicIcon() {
  return (
    <svg aria-hidden="true" width="21" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 18.5v3.5M8 22h8" />
    </svg>
  );
}

function InputMicIcon() {
  return (
    <svg aria-hidden="true" width="14" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" fill="currentColor" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 18.5v3.5M8 22h8" />
    </svg>
  );
}

export const timestampRowClassName = "mt-3 mb-2 flex w-full justify-center px-4";

export function TimestampDivider({ text }: { text: string }) {
  return (
    <span className="text-center text-[10px] tracking-[-0.1px] text-[var(--subtle)]">
      <strong className="font-normal text-[color-mix(in_srgb,var(--header-text)_58%,transparent)]">
        {text}
      </strong>
    </span>
  );
}

export function messageRowClassName(mine: boolean, firstInGroup: boolean) {
  return cn("flex px-3.5", mine ? "justify-end" : "justify-start", firstInGroup ? "mt-2" : "mt-0.5");
}

export function MessageBubble({
  message,
  mine,
  gradient,
  showTail,
}: {
  message: Message;
  mine: boolean;
  gradient: { top: string; bottom: string };
  showTail: boolean;
}) {
  return (
    <div
      className={cn(
        "relative max-w-[73%] rounded-[18px] px-[13px] py-[7px] text-[15px] leading-[1.35] font-extralight tracking-[-0.005em] break-words whitespace-pre-wrap",
        mine
          ? "text-white outgoing-bubble"
          : "bg-[var(--incoming)] text-[var(--incoming-text)]",
      )}
      style={
        mine
          ? ({
              "--grad-top": gradient.top,
              "--grad-bottom": gradient.bottom,
              backgroundColor: "color-mix(in srgb, var(--grad-top) var(--percent-top, 0%), var(--grad-bottom))",
            } as React.CSSProperties)
          : undefined
      }
    >
      {message.text}
      {showTail ? <BubbleTail mine={mine} /> : null}
    </div>
  );
}

const MessageList = memo(function MessageList({
  messages,
  ownerId,
  isContactTyping,
  showStatus,
  statusText,
  isStatusPending,
  bubbleColor,
  isDark,
}: {
  messages: Message[];
  ownerId: string;
  isContactTyping: boolean;
  showStatus: boolean;
  statusText: string;
  isStatusPending: boolean;
  bubbleColor: StudioState["bubbleColor"];
  isDark: boolean;
}) {
  const gradient = BUBBLE_GRADIENTS[bubbleColor][isDark ? "dark" : "light"];

  return (
    <AnimatePresence initial={false}>
      {messages.map((message, index) => {
        if (message.type === "timestamp") {
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={SPRING_SNAPPY}
              className={timestampRowClassName}
            >
              <TimestampDivider text={message.text} />
            </motion.div>
          );
        }

        const mine = message.senderId === ownerId;
        const { firstInGroup, lastInGroup } = getMessageGroupFlags(messages, index);
        // The very last message's tail waits for its status to land, so the
        // tail and the "Delivered"/"Read" text appear together as one unit.
        const isLastOverall = index === messages.length - 1;
        const suppressTail = mine && isLastOverall && isStatusPending;

        return (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10, scale: 0.95, originX: mine ? 1 : 0, originY: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={SPRING_SNAPPY}
            className={messageRowClassName(mine, firstInGroup)}
          >
            <MessageBubble
              message={message}
              mine={mine}
              gradient={gradient}
              showTail={lastInGroup && (!isContactTyping || mine) && !suppressTail}
            />
          </motion.div>
        );
      })}
      {showStatus ? (
        <motion.div
          key="status"
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto", transition: SPRING_SNAPPY }}
          // Exit fast rather than mirroring the entrance spring: this status is
          // superseded the instant a new outgoing message lands, so a slow
          // exit would still be visibly shrinking underneath the new bubble.
          exit={{ opacity: 0, y: -10, height: 0, transition: { duration: 0.12 } }}
          className="flex justify-end px-4 pt-[3px] pb-0.5 text-[10px] font-normal text-[var(--subtle)] overflow-hidden"
        >
          <div className="flex justify-end w-full">{statusText}</div>
        </motion.div>
      ) : null}
      {isContactTyping && <TypingBubble key="typing-bubble" />}
    </AnimatePresence>
  );
});
