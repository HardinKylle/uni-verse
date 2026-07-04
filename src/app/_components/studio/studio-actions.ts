/**
 * Pure state-transition functions for the studio editor.
 *
 * Components still hold state via `useState` + context (see studio-context.tsx) —
 * this module just centralizes the non-trivial mutations (cascading deletes,
 * id generation, drag reordering) so they aren't duplicated or reimplemented
 * slightly differently across editor-sidebar.tsx / script-panel.tsx. Call as
 * `setState((current) => deleteCharacter(current, id))`.
 */

import { arrayMove } from "@dnd-kit/sortable";

import { CHARACTER_PALETTE } from "./constants";
import type { Character, StudioState } from "./types";

/** `crypto.randomUUID()` with a fallback for non-secure contexts / older runtimes. */
export function newId(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${uuid}`;
}

export function addMessage(state: StudioState): StudioState {
  const text = state.draft.replace(/\s+$/, "");
  if (!text.trim()) return state;

  return {
    ...state,
    messages: [...state.messages, { id: newId("m"), senderId: state.activeSenderId, text }],
    draft: "",
  };
}

export function addTimestamp(state: StudioState): StudioState {
  const text = `${state.day} ${state.time} ${state.meridiem}`;
  return {
    ...state,
    messages: [...state.messages, { id: newId("m"), senderId: "system", text, type: "timestamp" }],
  };
}

export function updateMessageText(state: StudioState, id: string, text: string): StudioState {
  return {
    ...state,
    messages: state.messages.map((message) => (message.id === id ? { ...message, text } : message)),
  };
}

export function deleteMessage(state: StudioState, id: string): StudioState {
  return {
    ...state,
    messages: state.messages.filter((message) => message.id !== id),
    frameBreaks: state.frameBreaks.filter((breakId) => breakId !== id),
  };
}

/** Toggles a forced export-frame break immediately before the given message. */
export function toggleFrameBreak(state: StudioState, id: string): StudioState {
  const hasBreak = state.frameBreaks.includes(id);
  return {
    ...state,
    frameBreaks: hasBreak
      ? state.frameBreaks.filter((breakId) => breakId !== id)
      : [...state.frameBreaks, id],
  };
}

export function duplicateMessage(state: StudioState, id: string): StudioState {
  const index = state.messages.findIndex((m) => m.id === id);
  if (index === -1) return state;
  const original = state.messages[index];
  const duplicatedMessage = { ...original, id: newId("m") };
  const newMessages = [...state.messages];
  newMessages.splice(index + 1, 0, duplicatedMessage);
  return { ...state, messages: newMessages };
}

export function cycleMessageSender(state: StudioState, messageId: string): StudioState {
  const senderIds = state.characters.map(({ id }) => id);
  const message = state.messages.find(({ id }) => id === messageId);
  if (!message || senderIds.length === 0) return state;

  const nextSenderId = senderIds[(senderIds.indexOf(message.senderId) + 1) % senderIds.length];
  return {
    ...state,
    messages: state.messages.map((candidate) =>
      candidate.id === messageId ? { ...candidate, senderId: nextSenderId } : candidate,
    ),
  };
}

export function reorderMessages(state: StudioState, activeId: string, overId: string): StudioState {
  if (activeId === overId) return state;

  const oldIndex = state.messages.findIndex((m) => m.id === activeId);
  const newIndex = state.messages.findIndex((m) => m.id === overId);
  if (oldIndex === -1 || newIndex === -1) return state;

  return { ...state, messages: arrayMove(state.messages, oldIndex, newIndex) };
}

/** Applies an `@mention` selection: drops the trailing `@query` from the draft and switches sender. */
export function selectMentionSender(state: StudioState, character: Character): StudioState {
  const lastAtPos = state.draft.lastIndexOf("@");
  const newDraft = lastAtPos === -1 ? state.draft : state.draft.slice(0, lastAtPos);

  return { ...state, draft: newDraft, activeSenderId: character.id };
}

export function updateCharacter(state: StudioState, id: string, update: Partial<Character>): StudioState {
  return {
    ...state,
    characters: state.characters.map((character) =>
      character.id === id ? { ...character, ...update } : character,
    ),
  };
}

export function addCharacter(state: StudioState): StudioState {
  const usedColors = new Set(state.characters.map(({ color }) => color));
  const color =
    CHARACTER_PALETTE.find((candidate) => !usedColors.has(candidate)) ??
    CHARACTER_PALETTE[state.characters.length % CHARACTER_PALETTE.length];
  const id = crypto.randomUUID();

  return {
    ...state,
    characters: [...state.characters, { id, name: "New", color }],
    editingCharacterId: id,
    activeSenderId: id,
  };
}

/** No-op when only one character remains — a cast needs at least one sender/owner. */
export function deleteCharacter(state: StudioState, id: string): StudioState {
  if (state.characters.length <= 1 || !state.characters.some((character) => character.id === id)) {
    return state;
  }

  const characters = state.characters.filter(({ id: characterId }) => characterId !== id);
  const replacementId = characters[0].id;

  return {
    ...state,
    characters,
    messages: state.messages.map((message) =>
      message.senderId === id ? { ...message, senderId: replacementId } : message,
    ),
    ownerId: state.ownerId === id ? replacementId : state.ownerId,
    activeSenderId: state.activeSenderId === id ? replacementId : state.activeSenderId,
    editingCharacterId: null,
  };
}

export function toggleEditingCharacter(state: StudioState, id: string): StudioState {
  return { ...state, editingCharacterId: state.editingCharacterId === id ? null : id };
}
