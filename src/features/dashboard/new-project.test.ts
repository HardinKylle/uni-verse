import { describe, expect, it } from "vitest";

import { CHARACTER_PALETTE } from "@/features/studio/constants";
import { deserializeEpisode } from "@/features/studio/persistence/episode-doc";
import { createBlankProjectSeed } from "./new-project";

describe("createBlankProjectSeed", () => {
  it("creates an untitled story with a blank two-character episode", () => {
    const seed = createBlankProjectSeed();

    expect(seed.title).toBe("Untitled Story");
    expect(seed.characters).toHaveLength(2);
    expect(seed.characters.map(({ name }) => name)).toEqual(["", ""]);
    expect(seed.characters.map(({ color }) => color)).toEqual([
      CHARACTER_PALETTE[0],
      CHARACTER_PALETTE[1],
    ]);
    expect(seed.characters[0].id).not.toBe(seed.characters[1].id);

    const state = deserializeEpisode(seed.script, seed.characters);
    expect(state.messages).toEqual([]);
    expect(state.ownerId).toBe(seed.characters[1].id);
    expect(state.activeSenderId).toBe(seed.characters[0].id);
  });
});
