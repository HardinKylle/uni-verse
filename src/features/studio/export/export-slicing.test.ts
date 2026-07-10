import { describe, expect, it } from "vitest";

import { sliceIntoFrames } from "./export-slicing";
import type { Message } from "../types";

function makeMessages(count: number): Message[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `m${i + 1}`,
    senderId: "c1",
    text: `message ${i + 1}`,
  }));
}

describe("sliceIntoFrames", () => {
  it("returns no frames for an empty conversation", () => {
    expect(sliceIntoFrames([], [], new Map(), 1000)).toEqual([]);
  });

  it("packs messages into a single frame when they fit", () => {
    const messages = makeMessages(3);
    const heights = new Map(messages.map((m) => [m.id, 50]));

    const frames = sliceIntoFrames(messages, [], heights, 200);

    expect(frames).toHaveLength(1);
    expect(frames[0]).toHaveLength(3);
  });

  it("starts a new frame once the target height would overflow", () => {
    const messages = makeMessages(4);
    const heights = new Map(messages.map((m) => [m.id, 50]));

    const frames = sliceIntoFrames(messages, [], heights, 120);

    expect(frames.map((f) => f.map((m) => m.id))).toEqual([
      ["m1", "m2"],
      ["m3", "m4"],
    ]);
  });

  it("uses the larger continuation budget after the first frame", () => {
    const messages = makeMessages(5);
    const heights = new Map(messages.map((message) => [message.id, 40]));

    const frames = sliceIntoFrames(messages, [], heights, 80, 120);

    expect(frames.map((frame) => frame.map((message) => message.id))).toEqual([
      ["m1", "m2"],
      ["m3", "m4", "m5"],
    ]);
  });

  it("forces a break at a frameBreaks id even if there's room left", () => {
    const messages = makeMessages(4);
    const heights = new Map(messages.map((m) => [m.id, 10]));

    const frames = sliceIntoFrames(messages, ["m3"], heights, 1000);

    expect(frames.map((f) => f.map((m) => m.id))).toEqual([
      ["m1", "m2"],
      ["m3", "m4"],
    ]);
  });

  it("ignores a forced break on the first message (no empty leading frame)", () => {
    const messages = makeMessages(2);
    const heights = new Map(messages.map((m) => [m.id, 10]));

    const frames = sliceIntoFrames(messages, ["m1"], heights, 1000);

    expect(frames).toHaveLength(1);
    expect(frames[0].map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("gives an over-tall message its own frame instead of dropping or splitting it", () => {
    const messages = makeMessages(3);
    const heights = new Map([
      ["m1", 50],
      ["m2", 500],
      ["m3", 50],
    ]);

    const frames = sliceIntoFrames(messages, [], heights, 100);

    expect(frames.map((f) => f.map((m) => m.id))).toEqual([["m1"], ["m2"], ["m3"]]);
  });

  it("treats an unmeasured message (missing from the heights map) as zero height", () => {
    const messages = makeMessages(2);
    const heights = new Map<string, number>();

    const frames = sliceIntoFrames(messages, [], heights, 10);

    expect(frames).toHaveLength(1);
    expect(frames[0]).toHaveLength(2);
  });
});
