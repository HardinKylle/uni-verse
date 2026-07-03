"use client";

import { cn } from "@/lib/utils";

import { Avatar } from "./editor-sidebar";
import { useStudio } from "./studio-context";
import type { Character } from "./types";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d44d5c]";
const lightTheme = "[--screen-bg:#fff] [--header-bg:rgba(248,248,248,0.86)] [--header-text:#000] [--subtle:#8e8e93] [--incoming:#e9e9eb] [--incoming-text:#000] [--outgoing:#0b93f6] [--divider:rgba(60,60,67,0.16)] [--field:#fff] [--field-border:#d9d9de] [--home:#000] [--plus-bg:#eaeaea]";
const darkTheme = "[--screen-bg:#000] [--header-bg:rgba(24,24,26,0.82)] [--header-text:#fff] [--subtle:#98989f] [--incoming:#262629] [--incoming-text:#fff] [--outgoing:#0a84ff] [--divider:rgba(120,120,128,0.34)] [--field:#1c1c1e] [--field-border:#2e2e31] [--home:#fff] [--plus-bg:#1c1c1e]";

export function PhonePreview() {
  const { state } = useStudio();
  const characterById = new Map(state.characters.map((character) => [character.id, character]));
  const owner = characterById.get(state.ownerId) ?? state.characters[0];
  const contact = state.characters.find(({ id }) => id !== owner.id) ?? state.characters[0];
  const lastMessage = state.messages.at(-1);
  const showStatus =
    state.status !== "None" && lastMessage?.senderId === owner.id;
  const statusText =
    state.status === "Read" && state.readTime.trim()
      ? `Read ${state.readTime.trim()}`
      : state.status;

  return (
    <section className="flex h-full min-w-0 flex-1 items-center justify-center overflow-auto bg-[radial-gradient(130%_120%_at_50%_-10%,#ead3cb_0%,#c98b92_100%)] p-7" aria-label="Message preview">
      <div className="relative h-[812px] w-96 shrink-0 rounded-[56px] bg-[#0b0b0c] p-[13px] shadow-[0_34px_70px_-24px_rgba(0,0,0,0.55),inset_0_0_0_2px_#26262a]">
        <div
          className={cn("relative flex h-full flex-col overflow-hidden rounded-[44px] bg-[var(--screen-bg)] font-['SF_Pro_Text'] text-[var(--header-text)] transition-colors duration-250", state.dark ? darkTheme : lightTheme, state.bubbleColor === "green" && "[--outgoing:#4cd964]")}
          data-bubble={state.bubbleColor}
          data-theme={state.dark ? "dark" : "light"}
        >
          <StatusBar time={state.time} />
          <ConversationHeader contact={contact} />

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--screen-bg)] py-1.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:w-0">
            <div className="mt-1 mb-2.5 text-center text-[10px] tracking-[-0.1px] text-[var(--subtle)]">
              <strong className="font-normal text-[color-mix(in_srgb,var(--header-text)_58%,transparent)]">{state.day}</strong> {state.time} {state.meridiem}
            </div>

            <div>
              {state.messages.map((message, index) => {
                const mine = message.senderId === owner.id;
                const previous = state.messages[index - 1];
                const next = state.messages[index + 1];
                const firstInGroup = !previous || previous.senderId !== message.senderId;
                const lastInGroup = !next || next.senderId !== message.senderId;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex px-3.5",
                      mine ? "justify-end" : "justify-start",
                      firstInGroup ? "mt-2" : "mt-0.5",
                    )}
                  >
                    <div
                      className={cn(
                        "relative max-w-[73%] rounded-[18px] px-[13px] py-[7px] text-[15px] leading-[1.35] font-extralight tracking-[-0.005em] break-words whitespace-pre-wrap",
                        mine
                          ? "bg-[var(--outgoing)] text-white"
                          : "bg-[var(--incoming)] text-[var(--incoming-text)]",
                      )}
                    >
                      {message.text}
                      {lastInGroup ? <BubbleTail mine={mine} /> : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {showStatus ? <div className="flex justify-end px-4 pt-[3px] pb-0.5 text-[10px] font-normal text-[var(--subtle)]">{statusText}</div> : null}
          </div>

          <MessageInput />
          <div className="flex h-6 shrink-0 items-center justify-center bg-[var(--screen-bg)]">
            <div className="h-[5px] w-[135px] rounded-[3px] bg-[var(--home)] opacity-92" />
          </div>
        </div>
      </div>
    </section>
  );
}

function BubbleTail({ mine }: { mine: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 17 21"
      className={cn(
        "absolute bottom-[-1px] h-[18px] w-[15px]",
        mine
          ? "right-[-4.3px] text-[var(--outgoing)]"
          : "left-[-4.3px] -scale-x-100 text-[var(--incoming)]",
      )}
    >
      <path
        d="M16.8869 20.1846C11.6869 20.9846 6.55352 18.1212 4.88685 16.2879C6.60472 12.1914 -4.00107 2.24186 2.99893 2.24148C4.61754 2.24148 6 -1.9986 11.8869 1.1846C11.9081 2.47144 11.8869 6.92582 11.8869 7.6842C11.8869 18.1842 17.8869 19.5813 16.8869 20.1846Z"
        fill="currentColor"
      />
    </svg>
  );
}

function StatusBar({ time }: { time: string }) {
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

function ConversationHeader({ contact }: { contact: Character }) {
  return (
    <div className="relative shrink-0 border-b border-[var(--divider)] bg-[var(--header-bg)] px-3 pt-2 pb-2.5 backdrop-blur-[18px]">
      <button type="button" className={cn("absolute top-[15px] left-1.5 flex cursor-pointer items-center gap-px border-0 bg-transparent p-1 text-[var(--outgoing)]", focusRing)} aria-label="Back to conversations">
        <ChevronLeftIcon />
      </button>
      <button type="button" className={cn("absolute top-[19px] right-4 cursor-pointer border-0 bg-transparent text-[var(--outgoing)]", focusRing)} aria-label="Start video call">
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

function MessageInput() {
  return (
    <div className="flex shrink-0 items-end gap-2 bg-[var(--screen-bg)] px-3 pt-1.5 pb-1">
      <button type="button" className={cn("flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--plus-bg)] p-0 text-[var(--subtle)]", focusRing)} aria-label="Add attachment">
        <PlusIcon />
      </button>
      <div className="flex min-h-[35px] flex-1 items-center rounded-[18px] border border-[var(--field-border)] bg-[var(--field)] py-[5px] pr-1.5 pl-3.5">
        <span className="flex-1 text-[15px] text-[var(--subtle)]">iMessage</span>
        <button type="button" className={cn("flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--outgoing)] p-0 text-white", focusRing)} aria-label="Send message">
          <SendIcon />
        </button>
      </div>
    </div>
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
    <svg width="18" height="12" viewBox="0 0 18 12">
      <rect y="8" width="3" height="4" rx="1" fill="currentColor" />
      <rect x="5" y="5" width="3" height="7" rx="1" fill="currentColor" />
      <rect x="10" y="2.5" width="3" height="9.5" rx="1" fill="currentColor" />
      <rect x="15" width="3" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg aria-hidden="true" width="17" height="12" viewBox="0 0 17 12">
      <path d="M1.4 3.85a10.8 10.8 0 0 1 14.2 0M4.15 6.75a6.7 6.7 0 0 1 8.7 0" stroke="currentColor" strokeWidth="2.3" fill="none" strokeLinecap="round" />
      <circle cx="8.5" cy="10.15" r="1.5" fill="currentColor" />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg width="25" height="12" viewBox="0 0 25 12">
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
