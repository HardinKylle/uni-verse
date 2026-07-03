import { describe, expect, it } from "vitest";

import {
  addCharacter,
  addMessage,
  cycleMessageSender,
  deleteCharacter,
  deleteMessage,
  reorderMessages,
  selectMentionSender,
  toggleEditingCharacter,
  updateCharacter,
  updateMessageText,
} from "./studio-actions";
import type { StudioState } from "./types";

function makeState(overrides: Partial<StudioState> = {}): StudioState {
  return {
    dark: false,
    characters: [
      { id: "c1", name: "Jaz", color: "#ff7a7a" },
      { id: "c2", name: "Kylle", color: "#5aa9e6" },
    ],
    ownerId: "c2",
    activeSenderId: "c1",
    messages: [
      { id: "m1", senderId: "c1", text: "hi" },
      { id: "m2", senderId: "c2", text: "hey" },
    ],
    editingCharacterId: null,
    status: "Delivered",
    day: "Today",
    time: "9:41",
    meridiem: "AM",
    inbox: 12,
    readTime: "10:01 PM",
    bubbleColor: "blue",
    draft: "",
    projectName: "Untitled Episode",
    projectDescription: "A new story...",
    isRightPanelOpen: true,
    showKeyboard: false,
    ...overrides,
  };
}

describe("addMessage", () => {
  it("appends a message from the active sender and clears the draft", () => {
    const state = makeState({ draft: "new message" });
    const next = addMessage(state);

    expect(next.messages).toHaveLength(3);
    expect(next.messages.at(-1)).toMatchObject({ senderId: "c1", text: "new message" });
    expect(next.draft).toBe("");
  });

  it("does nothing for a blank draft", () => {
    const state = makeState({ draft: "   " });
    expect(addMessage(state)).toBe(state);
  });

  it("trims trailing whitespace but keeps internal content", () => {
    const state = makeState({ draft: "hello world   " });
    const next = addMessage(state);
    expect(next.messages.at(-1)?.text).toBe("hello world");
  });
});

describe("updateMessageText / deleteMessage", () => {
  it("updates only the targeted message", () => {
    const next = updateMessageText(makeState(), "m1", "edited");
    expect(next.messages.find((m) => m.id === "m1")?.text).toBe("edited");
    expect(next.messages.find((m) => m.id === "m2")?.text).toBe("hey");
  });

  it("removes the targeted message", () => {
    const next = deleteMessage(makeState(), "m1");
    expect(next.messages.map((m) => m.id)).toEqual(["m2"]);
  });
});

describe("cycleMessageSender", () => {
  it("advances to the next character, wrapping around", () => {
    const next = cycleMessageSender(makeState(), "m1");
    expect(next.messages.find((m) => m.id === "m1")?.senderId).toBe("c2");

    const wrapped = cycleMessageSender(next, "m1");
    expect(wrapped.messages.find((m) => m.id === "m1")?.senderId).toBe("c1");
  });
});

describe("reorderMessages", () => {
  it("moves a message to another position", () => {
    const next = reorderMessages(makeState(), "m2", "m1");
    expect(next.messages.map((m) => m.id)).toEqual(["m2", "m1"]);
  });

  it("is a no-op when active and over ids match", () => {
    const state = makeState();
    expect(reorderMessages(state, "m1", "m1")).toBe(state);
  });
});

describe("selectMentionSender", () => {
  it("strips the trailing @query and switches the active sender", () => {
    const state = makeState({ draft: "hey @ky", activeSenderId: "c1" });
    const next = selectMentionSender(state, { id: "c2", name: "Kylle", color: "#5aa9e6" });

    expect(next.draft).toBe("hey ");
    expect(next.activeSenderId).toBe("c2");
  });
});

describe("character actions", () => {
  it("updateCharacter patches only the matching character", () => {
    const next = updateCharacter(makeState(), "c1", { name: "Jazz" });
    expect(next.characters.find((c) => c.id === "c1")?.name).toBe("Jazz");
    expect(next.characters.find((c) => c.id === "c2")?.name).toBe("Kylle");
  });

  it("addCharacter assigns an unused palette color and focuses the new character", () => {
    const next = addCharacter(makeState());
    expect(next.characters).toHaveLength(3);

    const added = next.characters.at(-1)!;
    expect(next.characters.filter((c) => c.color === added.color)).toHaveLength(1);
    expect(next.editingCharacterId).toBe(added.id);
    expect(next.activeSenderId).toBe(added.id);
  });

  it("deleteCharacter reassigns messages, owner, and active sender", () => {
    const next = deleteCharacter(makeState({ ownerId: "c1", activeSenderId: "c1" }), "c1");

    expect(next.characters.map((c) => c.id)).toEqual(["c2"]);
    expect(next.messages.every((m) => m.senderId === "c2")).toBe(true);
    expect(next.ownerId).toBe("c2");
    expect(next.activeSenderId).toBe("c2");
  });

  it("deleteCharacter refuses to remove the last character", () => {
    const state = makeState({ characters: [{ id: "c1", name: "Jaz", color: "#ff7a7a" }] });
    expect(deleteCharacter(state, "c1")).toBe(state);
  });

  it("toggleEditingCharacter opens then closes editing for a character", () => {
    const opened = toggleEditingCharacter(makeState(), "c1");
    expect(opened.editingCharacterId).toBe("c1");

    const closed = toggleEditingCharacter(opened, "c1");
    expect(closed.editingCharacterId).toBeNull();
  });
});
