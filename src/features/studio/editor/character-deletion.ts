import type { EpisodeDocument } from "../persistence/episode-doc";
import type { Message, StudioState } from "../types";

export type CharacterDeletionResolution =
  | { type: "reassign"; targetId: string }
  | { type: "delete-messages" };

type CharacterReferences = {
  messages: Message[];
  frameBreaks: string[];
  ownerId: string;
  activeSenderId: string;
};

function reassignReferences<T extends CharacterReferences>(
  source: T,
  characterId: string,
  targetId: string,
): T {
  return {
    ...source,
    messages: source.messages.map((message) =>
      message.senderId === characterId ? { ...message, senderId: targetId } : message,
    ),
    ownerId: source.ownerId === characterId ? targetId : source.ownerId,
    activeSenderId: source.activeSenderId === characterId ? targetId : source.activeSenderId,
  };
}

function deleteMessageReferences<T extends CharacterReferences>(
  source: T,
  characterId: string,
  fallbackId: string,
): T {
  const removedMessageIds = new Set(
    source.messages
      .filter(({ senderId }) => senderId === characterId)
      .map(({ id }) => id),
  );

  return {
    ...source,
    messages: source.messages.filter(({ senderId }) => senderId !== characterId),
    frameBreaks: source.frameBreaks.filter((messageId) => !removedMessageIds.has(messageId)),
    ownerId: source.ownerId === characterId ? fallbackId : source.ownerId,
    activeSenderId: source.activeSenderId === characterId ? fallbackId : source.activeSenderId,
  };
}

function canRemoveCharacter(state: StudioState, characterId: string): boolean {
  return (
    state.characters.length > 2 &&
    state.characters.some(({ id }) => id === characterId)
  );
}

function withoutCharacter(state: StudioState, characterId: string): StudioState {
  return {
    ...state,
    characters: state.characters.filter(({ id }) => id !== characterId),
    editingCharacterId: null,
  };
}

export function reassignCharacterReferences(
  state: StudioState,
  characterId: string,
  targetId: string,
): StudioState {
  return reassignReferences(state, characterId, targetId);
}

export function deleteCharacterMessageReferences(
  state: StudioState,
  characterId: string,
): StudioState {
  const fallbackId = state.characters.find(({ id }) => id !== characterId)?.id;
  return fallbackId
    ? deleteMessageReferences(state, characterId, fallbackId)
    : state;
}

export function removeCharacterFromCast(
  state: StudioState,
  characterId: string,
): StudioState {
  return canRemoveCharacter(state, characterId)
    ? withoutCharacter(state, characterId)
    : state;
}

export function reassignCharacterTo(
  state: StudioState,
  characterId: string,
  targetId: string,
): StudioState {
  if (
    !canRemoveCharacter(state, characterId) ||
    targetId === characterId ||
    !state.characters.some(({ id }) => id === targetId)
  ) {
    return state;
  }

  return removeCharacterFromCast(
    reassignCharacterReferences(state, characterId, targetId),
    characterId,
  );
}

export function deleteCharacterWithMessages(
  state: StudioState,
  characterId: string,
): StudioState {
  if (!canRemoveCharacter(state, characterId)) return state;

  return removeCharacterFromCast(
    deleteCharacterMessageReferences(state, characterId),
    characterId,
  );
}

export function updateEpisodeForCharacterDeletion(
  episode: EpisodeDocument,
  characterId: string,
  resolution: CharacterDeletionResolution,
  fallbackId: string,
): EpisodeDocument {
  return resolution.type === "reassign"
    ? reassignReferences(episode, characterId, resolution.targetId)
    : deleteMessageReferences(episode, characterId, fallbackId);
}

export function countCharacterMessages(
  messages: Message[],
  characterId: string,
): number {
  return messages.filter(({ senderId }) => senderId === characterId).length;
}
