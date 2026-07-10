import { describe, expect, it } from "vitest";

import { canAddCharacter, exportFramesForUser } from "./anonymous-limits";

describe("exportFramesForUser", () => {
  const frames = [[1], [2], [3], [4], [5]];

  it("caps anonymous exports at three frames", () => {
    expect(exportFramesForUser(frames, false)).toEqual([[1], [2], [3]]);
  });

  it("does not alter short anonymous exports", () => {
    expect(exportFramesForUser(frames.slice(0, 3), false)).toEqual([[1], [2], [3]]);
  });

  it("does not cap signed-in exports", () => {
    expect(exportFramesForUser(frames, true)).toEqual(frames);
  });
});

describe("canAddCharacter", () => {
  it("lets anonymous writers grow the cast to three", () => {
    expect(canAddCharacter(2, false)).toBe(true);
  });

  it("stops anonymous writers at three characters", () => {
    expect(canAddCharacter(3, false)).toBe(false);
  });

  it("never limits signed-in writers", () => {
    expect(canAddCharacter(10, true)).toBe(true);
  });
});
