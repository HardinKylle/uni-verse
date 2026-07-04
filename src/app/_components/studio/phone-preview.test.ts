import { describe, expect, it } from "vitest";

import {
  computeGroupFlagsMap,
  getMessageGroupFlags,
  getOwnerAndContact,
  getStatusText,
} from "./phone-preview";
import type { Message } from "./types";

const messages: Message[] = [
  { id: "m1", senderId: "c1", text: "one" },
  { id: "m2", senderId: "c1", text: "two" },
  { id: "t1", senderId: "system", text: "Later", type: "timestamp" },
  { id: "m3", senderId: "c1", text: "three" },
  { id: "m4", senderId: "c2", text: "four" },
];

describe("message grouping", () => {
  it("groups consecutive messages from one sender", () => {
    expect(getMessageGroupFlags(messages, 0)).toEqual({ firstInGroup: true, lastInGroup: false });
    expect(getMessageGroupFlags(messages, 1)).toEqual({ firstInGroup: false, lastInGroup: true });
  });

  it("treats timestamps and sender changes as group boundaries", () => {
    expect(getMessageGroupFlags(messages, 3)).toEqual({ firstInGroup: true, lastInGroup: true });
    expect(getMessageGroupFlags(messages, 4)).toEqual({ firstInGroup: true, lastInGroup: true });
  });

  it("precomputes flags by stable message id", () => {
    const map = computeGroupFlagsMap(messages);
    expect(map.get("m2")).toEqual({ firstInGroup: false, lastInGroup: true });
    expect(map.get("m3")).toEqual({ firstInGroup: true, lastInGroup: true });
  });
});

describe("preview helpers", () => {
  it("formats read status and falls back when read time is blank", () => {
    expect(getStatusText("Read", " 10:01 PM ")).toBe("Read 10:01 PM");
    expect(getStatusText("Read", "   ")).toBe("Read");
    expect(getStatusText("Delivered", "ignored")).toBe("Delivered");
    expect(getStatusText("None", "ignored")).toBe("None");
  });

  it("resolves owner and first non-owner contact", () => {
    const characters = [
      { id: "c1", name: "One", color: "red" },
      { id: "c2", name: "Two", color: "blue" },
      { id: "c3", name: "Three", color: "green" },
    ];
    const result = getOwnerAndContact({ characters, ownerId: "c2" });
    expect(result.owner.id).toBe("c2");
    expect(result.contact.id).toBe("c1");
  });

  it("falls back safely when the owner id is stale", () => {
    const characters = [
      { id: "c1", name: "One", color: "red" },
      { id: "c2", name: "Two", color: "blue" },
    ];
    const result = getOwnerAndContact({ characters, ownerId: "missing" });
    expect(result.owner.id).toBe("c1");
    expect(result.contact.id).toBe("c2");
  });
});
