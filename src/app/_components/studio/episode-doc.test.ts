import { describe, expect, it } from "vitest";

import { deserializeEpisode, serializeEpisode } from "./episode-doc";
import type { Character, StudioState } from "./types";

const characters: Character[] = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Jaz", color: "#ff7a7a" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Kylle", color: "#5aa9e6" },
];

const state: StudioState = {
  dark: true,
  characters,
  ownerId: characters[1].id,
  activeSenderId: characters[0].id,
  messages: [{ id: "m-1", senderId: characters[0].id, text: "hello" }],
  editingCharacterId: characters[0].id,
  status: "Read",
  day: "Monday",
  time: "8:15",
  meridiem: "PM",
  inbox: 4,
  readTime: "8:16 PM",
  bubbleColor: "green",
  draft: "not persisted",
  projectName: "Test story",
  projectDescription: "Test description",
  isRightPanelOpen: false,
  showKeyboard: true,
  frameBreaks: ["m-1"],
};

describe("episode document", () => {
  it("round-trips persisted editor content without transient state", () => {
    const restored = deserializeEpisode(serializeEpisode(state), characters);

    expect(restored).toMatchObject({
      dark: true,
      ownerId: characters[1].id,
      activeSenderId: characters[0].id,
      messages: state.messages,
      status: "Read",
      day: "Monday",
      time: "8:15",
      meridiem: "PM",
      inbox: 4,
      readTime: "8:16 PM",
      bubbleColor: "green",
      frameBreaks: ["m-1"],
      draft: "",
      editingCharacterId: null,
      isRightPanelOpen: true,
      showKeyboard: false,
    });
  });

  it("uses safe defaults for a malformed document", () => {
    const restored = deserializeEpisode({ version: 1, messages: "broken" }, characters);

    expect(restored.messages).toEqual([]);
    expect(restored.ownerId).toBe(characters[0].id);
    expect(restored.activeSenderId).toBe(characters[0].id);
    expect(restored.status).toBe("Delivered");
    expect(restored.bubbleColor).toBe("blue");
  });

  it("uses safe defaults for an unsupported document version", () => {
    const restored = deserializeEpisode({
      version: 2,
      messages: [{ id: "m-1", senderId: characters[0].id, text: "future format" }],
    }, characters);

    expect(restored.messages).toEqual([]);
  });

  it("repairs unknown message senders to the first cast member", () => {
    const restored = deserializeEpisode(
      {
        version: 1,
        messages: [{ id: "m-1", senderId: "missing", text: "hello" }],
        ownerId: "missing",
        activeSenderId: "missing",
      },
      characters,
    );

    expect(restored.messages[0].senderId).toBe(characters[0].id);
    expect(restored.ownerId).toBe(characters[0].id);
    expect(restored.activeSenderId).toBe(characters[0].id);
  });
});
