"use client";

import { type KeyboardEvent, useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Trash2, ArrowLeftRight, GripVertical, Clock, Copy, Scissors } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "@/lib/utils";
import { useStudio } from "../studio-context";
import { focusRing, panelTitle } from "../ui/shared-ui";
import { addMessage, addTimestamp, cycleMessageSender, deleteMessage, duplicateMessage, reorderMessages, selectMentionSender, toggleFrameBreak, updateMessageText } from "./studio-actions";
import type { Message, Character } from "../types";

export function ScriptPanel() {
  const { state, setState } = useStudio();
  const characterById = new Map(state.characters.map((character) => [character.id, character]));
  const activeSender = characterById.get(state.activeSenderId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredCharacters = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return state.characters.filter(c => c.name.toLowerCase().includes(q));
  }, [state.characters, mentionQuery]);

  // Derived, not stored: clamp here rather than syncing mentionIndex back via
  // an effect whenever the filtered list shrinks.
  const safeMentionIndex = Math.min(mentionIndex, Math.max(filteredCharacters.length - 1, 0));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.messages.length]);

  function selectMention(character: Character) {
    setState((current) => selectMentionSender(current, character));
    setMentionQuery(null);
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery !== null) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionIndex((prev) => (prev + 1) % (filteredCharacters.length || 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionIndex((prev) => (prev - 1 + filteredCharacters.length) % (filteredCharacters.length || 1));
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        if (filteredCharacters.length > 0) {
          selectMention(filteredCharacters[safeMentionIndex]);
        } else {
          setMentionQuery(null);
        }
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      setState((current) => addMessage(current));
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setState((current) => reorderMessages(current, String(active.id), String(over.id)));
    }
  }

  return (
    <section className="relative flex h-full w-[480px] shrink-0 flex-col border-r border-sand-100 bg-white" aria-labelledby="script-title">
      <div className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md z-10 sticky top-0">
        <h2 className={panelTitle} id="script-title">Chat Script Timeline</h2>
        <span className="rounded-full bg-accent-100 px-2.5 py-0.5 font-mono text-[11px] font-medium text-accent-800">{state.messages.length}</span>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-[110px] bg-accent-100/10 [scrollbar-color:#e8ded7_transparent] [scrollbar-width:thin]">
        {state.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-70">
            <div className="w-12 h-12 rounded-full bg-accent-100/50 flex items-center justify-center mb-4 ring-1 ring-accent-200/50">
              <span className="text-xl">💬</span>
            </div>
            <p className="text-sm font-medium text-accent-900">No messages yet</p>
            <p className="text-xs text-sand-400 mt-1">Start writing the script below</p>
          </div>
        ) : (
          <DndContext id="script-panel-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={state.messages.map(m => m.id)} strategy={verticalListSortingStrategy}>
              <ul className="m-0 list-none p-0 flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {state.messages.map((message, index) => {
                    const sender = characterById.get(message.senderId) ?? state.characters[0];
                    return (
                      <SortableMessageNode
                        key={message.id}
                        message={message}
                        sender={sender}
                        index={index}
                      />
                    );
                  })}
                </AnimatePresence>
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="absolute bottom-6 left-1/2 w-[90%] -translate-x-1/2">
        <AnimatePresence>
          {mentionQuery !== null && (
            <CharacterPopover
              className="bottom-[calc(100%+8px)] left-0 w-64"
              header={<span className="font-mono text-[9.5px] font-medium tracking-[0.05em] text-sand-500 uppercase">Select Sender</span>}
            >
              {filteredCharacters.length === 0 ? (
                <li className="px-3 py-3 text-xs text-sand-500 text-center font-medium">
                  No characters match &ldquo;{mentionQuery}&rdquo;
                </li>
              ) : (
                filteredCharacters.map((char, idx) => (
                  <CharacterOption
                    key={char.id}
                    character={char}
                    isHighlighted={idx === safeMentionIndex}
                    onSelect={() => selectMention(char)}
                    onHover={() => setMentionIndex(idx)}
                  />
                ))
              )}
            </CharacterPopover>
          )}
        </AnimatePresence>

        <div className="rounded-2xl border border-sand-200 bg-white/90 backdrop-blur-xl p-3 shadow-lg ring-1 ring-black/5">
          <div className="relative mb-2 px-1 flex items-center gap-0.5">
            <span className="font-mono text-[9.5px] font-medium tracking-[0.05em] text-sand-500 uppercase">Writing as</span>

            <button
              type="button"
              onClick={() => setIsDropdownOpen((open) => !open)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="listbox"
              aria-label={`Writing as ${activeSender?.name ?? "unknown"}`}
              className={cn("flex items-center gap-1.5 rounded-full bg-accent-50 pl-1.5 pr-2.5 py-0.5 cursor-pointer hover:bg-accent-100 transition-colors", focusRing)}
            >
              <span className="size-1.5 rounded-full" style={{ backgroundColor: activeSender?.color }} />
              <span className="text-[10px] font-bold text-accent-600">{activeSender?.name ?? "?"}</span>
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <CharacterPopover className="top-[calc(100%+4px)] left-16 w-48">
                  {state.characters.map((char) => (
                    <CharacterOption
                      key={char.id}
                      character={char}
                      isHighlighted={state.activeSenderId === char.id}
                      onSelect={() => {
                        setState((current) => ({ ...current, activeSenderId: char.id }));
                        setIsDropdownOpen(false);
                      }}
                    />
                  ))}
                </CharacterPopover>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-end gap-2">
            <textarea
              id="new-message"
              aria-label="New message"
              className={cn("max-h-32 min-h-[44px] w-full resize-none rounded-xl border border-transparent bg-sand-100/50 px-3.5 py-3 text-[13px] leading-relaxed text-sand-900 placeholder:text-sand-400 transition-colors focus:border-sand-300 focus:bg-white focus:outline-none [scrollbar-width:none]", focusRing)}
              rows={Math.min(4, Math.max(1, state.draft.split('\n').length))}
              value={state.draft}
              placeholder="Type @ to switch sender..."
              onChange={(event) => {
                const value = event.target.value;
                setState((current) => ({ ...current, draft: value }));

                const lastAtPos = value.lastIndexOf("@");
                if (lastAtPos !== -1) {
                  const prevChar = lastAtPos > 0 ? value[lastAtPos - 1] : " ";
                  if (/\s/.test(prevChar)) {
                    const query = value.slice(lastAtPos + 1);
                    if (!query.includes(" ")) {
                      setMentionQuery(query);
                      setMentionIndex(0);
                      return;
                    }
                  }
                }
                setMentionQuery(null);
              }}
              onKeyDown={handleDraftKeyDown}
            />
            <button
              type="button"
              disabled={!state.draft.trim()}
              className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-500 text-white shadow-sm transition-all hover:bg-accent-600 active:scale-95 disabled:pointer-events-none disabled:bg-sand-100 disabled:text-sand-300", focusRing)}
              onClick={() => setState((current) => addMessage(current))}
              aria-label="Send message"
            >
              <Send className="size-4" />
            </button>
            <button
              type="button"
              className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-sand-500 shadow-sm transition-all hover:bg-sand-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50", focusRing)}
              onClick={() => setState((current) => addTimestamp(current))}
              aria-label="Add timestamp"
              title="Add timestamp divider"
            >
              <Clock className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Shared shell for the mention popover and the "Writing as" dropdown — same shape, different trigger. */
function CharacterPopover({ className, header, children }: { className: string; header?: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div
      role="listbox"
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={cn("absolute rounded-xl border border-sand-200 bg-white/95 backdrop-blur-xl shadow-xl ring-1 ring-black/5 overflow-hidden z-50", className)}
    >
      {header && <div className="px-3 py-2 border-b border-sand-100 bg-sand-50/50">{header}</div>}
      <ul className="max-h-48 overflow-y-auto p-1.5 m-0 list-none flex flex-col gap-0.5">{children}</ul>
    </motion.div>
  );
}

function CharacterOption({
  character,
  isHighlighted,
  onSelect,
  onHover,
}: {
  character: Character;
  isHighlighted: boolean;
  onSelect: () => void;
  onHover?: () => void;
}) {
  return (
    <li
      role="option"
      aria-selected={isHighlighted}
      tabIndex={0}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-[13px] font-semibold transition-colors",
        isHighlighted ? "bg-accent-100/50 text-accent-900" : "hover:bg-sand-50 text-sand-700"
      )}
      onClick={onSelect}
      onMouseEnter={onHover}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <span className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: character.color }} />
      {character.name}
    </li>
  );
}

/** Thin toggle sitting on the boundary between two rows — forces (or clears) an export frame break there. Skipped before the very first message, since a leading break is a no-op. */
function FrameBreakToggle({ messageId, hasBreak }: { messageId: string; hasBreak: boolean }) {
  const { setState } = useStudio();

  return (
    <div className={cn("absolute -top-[9px] left-0 right-0 z-10 flex justify-center", !hasBreak && "pointer-events-none")}>
      {hasBreak && (
        <div className="absolute left-[-16px] right-[-16px] top-1/2 -mt-px border-t-2 border-dashed border-accent-500 pointer-events-none" />
      )}
      <button
        type="button"
        onClick={() => setState((current) => toggleFrameBreak(current, messageId))}
        className={cn(
          "relative flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-widest uppercase transition-all pointer-events-auto",
          hasBreak
            ? "border-accent-500 bg-accent-500 text-white opacity-100 shadow-md"
            : "border-sand-200 bg-white text-sand-400 opacity-0 hover:border-accent-400 hover:text-accent-600 group-hover:opacity-100",
          focusRing,
        )}
        aria-label={hasBreak ? "Remove frame break" : "Insert frame break here"}
        title={hasBreak ? "Frame break — click to remove" : "Insert frame break here"}
      >
        <Scissors className="size-2.5" />
        {hasBreak ? "Frame break" : "Break"}
      </button>
    </div>
  );
}

function SortableMessageNode({ message, sender, index }: { message: Message; sender: Character; index: number }) {
  const { state, setState } = useStudio();
  const hasFrameBreak = state.frameBreaks.includes(message.id);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: message.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { zIndex: 50, position: "relative" as const } : {}),
  };

  if (message.type === "timestamp") {
    return (
      <motion.li
        ref={setNodeRef}
        style={style}
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
        className={cn("group relative flex items-center justify-center py-2 transition-opacity", isDragging && "opacity-50")}
      >
        {index > 0 && <FrameBreakToggle messageId={message.id} hasBreak={hasFrameBreak} />}
        <div className="absolute inset-y-0 -left-2 -right-2 rounded-xl bg-sand-100/0 transition-colors group-hover:bg-sand-100/50" />
        <div className="relative flex w-full items-center justify-center px-4">
          <div {...attributes} {...listeners} className="absolute left-0 cursor-grab px-2 py-3 text-sand-300 opacity-0 hover:text-sand-600 active:cursor-grabbing group-hover:opacity-100">
            <GripVertical className="size-3.5" />
          </div>

          <input
            type="text"
            aria-label="Timestamp text"
            className="w-full bg-transparent text-center text-xs font-semibold tracking-wide text-sand-400 placeholder:text-sand-300 focus:outline-none"
            value={message.text}
            onChange={(e) => setState((current) => updateMessageText(current, message.id, e.target.value))}
            placeholder="Today 9:41 AM"
          />

          <div className="absolute right-0 flex items-center px-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button type="button" onClick={() => setState((current) => duplicateMessage(current, message.id))} className="rounded p-1.5 text-sand-400 transition-colors hover:bg-sand-100 hover:text-sand-900 focus:outline-none" aria-label="Duplicate timestamp" title="Duplicate timestamp">
              <Copy className="size-3.5" />
            </button>
            <button type="button" onClick={() => setState((current) => deleteMessage(current, message.id))} className="rounded p-1.5 text-sand-400 transition-colors hover:bg-red-50 hover:text-red-500 focus:outline-none" aria-label="Delete timestamp" title="Delete timestamp">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      </motion.li>
    );
  }

  return (
    <motion.li
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
      className={cn(
        "group relative flex items-start gap-2 rounded-xl border border-transparent p-2 transition-all duration-200",
        isDragging && "bg-white shadow-xl ring-1 ring-black/5 opacity-95 scale-[1.02] z-50"
      )}
    >
      {index > 0 && <FrameBreakToggle messageId={message.id} hasBreak={hasFrameBreak} />}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "mt-1 flex w-5 shrink-0 justify-center items-center text-sand-300 transition-colors hover:text-accent-500",
          isDragging ? "text-accent-500 cursor-grabbing" : "cursor-grab"
        )}
      >
        <GripVertical className={cn("absolute size-4 opacity-0 transition-opacity duration-200", isDragging ? "opacity-100" : "group-hover:opacity-100")} />
        <span className={cn("font-mono text-[10px] font-medium transition-opacity duration-200", isDragging ? "opacity-0" : "group-hover:opacity-0")}>{index + 1}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="size-2 shrink-0 rounded-full ring-1 ring-black/10"
            style={{ backgroundColor: sender.color }}
            aria-hidden="true"
          />
          <span className="text-[12px] font-bold text-sand-900">{sender.name}</span>
        </div>
        <label className="sr-only" htmlFor={`message-${message.id}`}>
          Message from {sender.name}
        </label>
        <textarea
          id={`message-${message.id}`}
          className="w-full resize-none bg-transparent text-[14px] leading-relaxed text-sand-700 placeholder-sand-300 focus:outline-none focus:ring-0 overflow-hidden"
          value={message.text}
          rows={message.text.split('\n').length || 1}
          onChange={(event) =>
            setState((current) => updateMessageText(current, message.id, event.target.value))
          }
        />
      </div>

      <div className="absolute right-3 top-2 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 rounded-lg bg-white/90 backdrop-blur-sm p-1 shadow-sm ring-1 ring-sand-200">
        <button
          type="button"
          className={cn("flex size-7 items-center justify-center rounded-md text-sand-400 hover:bg-sand-100 hover:text-sand-900 transition-colors", focusRing)}
          aria-label="Switch sender"
          title="Switch sender"
          onClick={() => setState((current) => cycleMessageSender(current, message.id))}
        >
          <ArrowLeftRight className="size-3.5" />
        </button>
        <button
          type="button"
          className={cn("flex size-7 items-center justify-center rounded-md text-sand-400 hover:bg-sand-100 hover:text-sand-900 transition-colors", focusRing)}
          aria-label="Duplicate message"
          title="Duplicate message"
          onClick={() => setState((current) => duplicateMessage(current, message.id))}
        >
          <Copy className="size-3.5" />
        </button>
        <button
          type="button"
          className={cn("flex size-7 items-center justify-center rounded-md text-sand-400 hover:bg-red-50 hover:text-red-600 transition-colors", focusRing)}
          aria-label="Delete message"
          title="Delete message"
          onClick={() => setState((current) => deleteMessage(current, message.id))}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </motion.li>
  );
}
