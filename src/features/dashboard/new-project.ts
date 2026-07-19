import { CHARACTER_PALETTE } from "@/features/studio/constants";
import { deserializeEpisode, serializeEpisode } from "@/features/studio/persistence/episode-doc";
import type { Character } from "@/features/studio/types";

export function createBlankProjectSeed() {
  const characters: Character[] = [
    { id: crypto.randomUUID(), name: "", color: CHARACTER_PALETTE[0] },
    { id: crypto.randomUUID(), name: "", color: CHARACTER_PALETTE[1] },
  ];
  const state = deserializeEpisode({}, characters);

  state.ownerId = characters[1].id;
  state.activeSenderId = characters[0].id;

  return {
    title: "Untitled Story",
    characters,
    script: serializeEpisode(state),
  };
}
