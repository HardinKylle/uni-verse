"use client";

import type { KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

import { useStudio } from "./studio-context";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d44d5c]";

export function ScriptPanel() {
  const { state, setState } = useStudio();
  const characterById = new Map(state.characters.map((character) => [character.id, character]));
  const activeSender = characterById.get(state.activeSenderId);

  function addMessage() {
    setState((current) => {
      const text = current.draft.replace(/\s+$/, "");
      if (!text.trim()) return current;

      const senderIds = current.characters.map(({ id }) => id);
      const currentIndex = senderIds.indexOf(current.activeSenderId);
      const nextSenderId =
        senderIds.length > 1
          ? senderIds[(currentIndex + 1) % senderIds.length]
          : current.activeSenderId;

      return {
        ...current,
        messages: [
          ...current.messages,
          { id: `m-${crypto.randomUUID()}`, senderId: current.activeSenderId, text },
        ],
        draft: "",
        activeSenderId: nextSenderId,
      };
    });
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      addMessage();
    }
  }

  return (
    <section className="flex h-full w-[452px] shrink-0 flex-col border-r border-black/7 bg-[#fbf3ee]" aria-labelledby="script-title">
      <div className="min-h-0 flex-1 overflow-y-auto px-[18px] pt-[22px] pb-3.5 [scrollbar-color:#d9b7ac_transparent] [scrollbar-width:thin]">
        <div className="mb-3.5 flex items-baseline gap-2 px-1">
          <h2 className="text-base font-extrabold tracking-[-0.01em]" id="script-title">Script</h2>
          <span className="text-xs font-semibold text-[#ad8791]">{state.messages.length} messages</span>
        </div>

        {state.messages.length === 0 ? (
          <p className="px-2 py-2.5 text-sm text-[#ad8791]">No messages yet — write one below.</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {state.messages.map((message) => {
              const sender = characterById.get(message.senderId) ?? state.characters[0];

              return (
                <li className="group flex items-center gap-[9px] rounded-[9px] px-2 py-1.5 hover:bg-[#f4e3dc]" key={message.id}>
                  <span
                    className="size-[9px] shrink-0 rounded-full"
                    style={{ backgroundColor: sender.color }}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    className={cn("shrink-0 cursor-pointer border-0 bg-transparent p-0 text-[15px] leading-[1.4] font-bold whitespace-nowrap", focusRing)}
                    style={{ color: sender.color }}
                    title="Click to switch sender"
                    onClick={() =>
                      setState((current) => {
                        const senderIds = current.characters.map(({ id }) => id);
                        const senderIndex = senderIds.indexOf(message.senderId);
                        return {
                          ...current,
                          messages: current.messages.map((candidate) =>
                            candidate.id === message.id
                              ? {
                                  ...candidate,
                                  senderId: senderIds[(senderIndex + 1) % senderIds.length],
                                }
                              : candidate,
                          ),
                        };
                      })
                    }
                  >
                    {sender.name}:
                  </button>
                  <label className="sr-only" htmlFor={`message-${message.id}`}>
                    Message from {sender.name}
                  </label>
                  <input
                    id={`message-${message.id}`}
                    className="min-w-0 flex-1 border-0 bg-transparent py-0.5 text-[15px] leading-[1.4] text-[#2b1520] focus:outline-none"
                    value={message.text}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        messages: current.messages.map((candidate) =>
                          candidate.id === message.id
                            ? { ...candidate, text: event.target.value }
                            : candidate,
                        ),
                      }))
                    }
                  />
                  <button
                    type="button"
                    className={cn("flex shrink-0 cursor-pointer items-center rounded-md border-0 bg-transparent p-[3px] text-[#c0473f] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[#f7dedc] focus-visible:opacity-100", focusRing)}
                    aria-label={`Delete message from ${sender.name}`}
                    title="Delete message"
                    onClick={() =>
                      setState((current) => ({
                        ...current,
                        messages: current.messages.filter(({ id }) => id !== message.id),
                      }))
                    }
                  >
                    <TrashIcon />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-[#ebd6ce] bg-[#f5e9e2] px-[18px] pt-3.5 pb-4">
        <label className="mb-[9px] block text-[10.5px] font-extrabold tracking-[0.09em] text-[#ad8791] uppercase" htmlFor="new-message">
          New message · <strong className="text-[#d44d5c]">{activeSender?.name ?? "?"}</strong>
        </label>
        <textarea
          id="new-message"
          className={cn("block w-full resize-none rounded-[9px] border border-[#ead2c9] bg-[#fbf4f0] px-2.5 py-2 text-[13px] text-[#2b1520] placeholder:text-[#c29aa0] focus:border-[#d44d5c] focus:bg-white focus:outline-none", focusRing)}
          rows={2}
          value={state.draft}
          placeholder="Type a message…  (Enter to add, Shift+Enter for newline)"
          onChange={(event) =>
            setState((current) => ({ ...current, draft: event.target.value }))
          }
          onKeyDown={handleDraftKeyDown}
        />
        <button type="button" className={cn("mt-2.5 w-full cursor-pointer rounded-[11px] border-0 bg-[#d44d5c] p-2.5 text-[13.5px] font-bold text-white", focusRing)} onClick={addMessage}>
          Add to conversation&nbsp; ▸
        </button>
      </div>
    </section>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
