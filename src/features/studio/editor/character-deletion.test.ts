import { describe, expect, it } from "vitest";

import {
  deleteCharacterWithMessages,
  reassignCharacterTo,
  updateEpisodeForCharacterDeletion,
} from "./character-deletion";
import type { EpisodeDocument } from "../persistence/episode-doc";
import type { StudioState } from "../types";

const characters = [
  { id: "c1", name: "Jaz", color: "#ff7a7a" },
  { id: "c2", name: "Kylle", color: "#5aa9e6" },
  { id: "c3", name: "Mina", color: "#8b5cf6" },
];

function makeState(overrides: Partial<StudioState> = {}): StudioState {
  return {
    dark: false,
    characters,
    ownerId: "c1",
    activeSenderId: "c1",
    messages: [
      { id: "m1", senderId: "c1", text: "one" },
      { id: "m2", senderId: "c2", text: "two" },
      { id: "m3", senderId: "c1", text: "three" },
    ],
    editingCharacterId: "c1",
    status: "Delivered",
    day: "Today",
    time: "9:41",
    meridiem: "AM",
    inbox: 12,
    readTime: "10:01 PM",
    bubbleColor: "blue",
    draft: "",
    episodeTitle: "Episode 1",
    episodeDescription: "",
    isRightPanelOpen: true,
    showKeyboard: false,
    frameBreaks: ["m1", "m2", "m3"],
    ...overrides,
  };
}

const episode: EpisodeDocument = {
  version: 1,
  messages: [
    { id: "m1", senderId: "c1", text: "one" },
    { id: "m2", senderId: "c2", text: "two" },
    { id: "m3", senderId: "c1", text: "three" },
  ],
  frameBreaks: ["m1", "m2", "m3"],
  ownerId: "c1",
  activeSenderId: "c1",
  skin: {
    dark: false,
    status: "Delivered",
    day: "Today",
    time: "9:41",
    meridiem: "AM",
    inbox: 12,
    readTime: "10:01 PM",
    bubbleColor: "blue",
  },
};

describe("character deletion transitions", () => {
  it("reassigns every message and ownership reference to the chosen character", () => {
    const next = reassignCharacterTo(makeState(), "c1", "c3");

    expect(next.characters.map(({ id }) => id)).toEqual(["c2", "c3"]);
    expect(next.messages.map(({ senderId }) => senderId)).toEqual(["c3", "c2", "c3"]);
    expect(next.frameBreaks).toEqual(["m1", "m2", "m3"]);
    expect(next.ownerId).toBe("c3");
    expect(next.activeSenderId).toBe("c3");
    expect(next.editingCharacterId).toBeNull();
  });

  it("deletes only that character's messages and cleans their frame breaks", () => {
    const next = deleteCharacterWithMessages(makeState(), "c1");

    expect(next.characters.map(({ id }) => id)).toEqual(["c2", "c3"]);
    expect(next.messages).toEqual([{ id: "m2", senderId: "c2", text: "two" }]);
    expect(next.frameBreaks).toEqual(["m2"]);
    expect(next.ownerId).toBe("c2");
    expect(next.activeSenderId).toBe("c2");
    expect(next.editingCharacterId).toBeNull();
  });

  it("does not let either transition reduce the cast below two", () => {
    const state = makeState({ characters: characters.slice(0, 2) });

    expect(reassignCharacterTo(state, "c1", "c2")).toBe(state);
    expect(deleteCharacterWithMessages(state, "c1")).toBe(state);
  });
});

describe("unloaded episode deletion transitions", () => {
  it("reassigns references without changing the remaining script", () => {
    const next = updateEpisodeForCharacterDeletion(
      episode,
      "c1",
      { type: "reassign", targetId: "c3" },
      "c2",
    );

    expect(next.messages.map(({ senderId }) => senderId)).toEqual(["c3", "c2", "c3"]);
    expect(next.frameBreaks).toEqual(["m1", "m2", "m3"]);
    expect(next.ownerId).toBe("c3");
    expect(next.activeSenderId).toBe("c3");
    expect(next.skin).toEqual(episode.skin);
  });

  it("removes messages and frame breaks while preserving the rest", () => {
    const next = updateEpisodeForCharacterDeletion(
      episode,
      "c1",
      { type: "delete-messages" },
      "c2",
    );

    expect(next.messages).toEqual([{ id: "m2", senderId: "c2", text: "two" }]);
    expect(next.frameBreaks).toEqual(["m2"]);
    expect(next.ownerId).toBe("c2");
    expect(next.activeSenderId).toBe("c2");
    expect(next.skin).toEqual(episode.skin);
  });
});
