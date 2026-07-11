import { describe, expect, it } from "vitest";

import { diffCharacters, serializeCharacters } from "./character-diff";
import type { Character } from "../types";

const projectId = "project-1";

const jaz: Character = { id: "char-1", name: "Jaz", color: "#ff7a7a" };
const kylle: Character = { id: "char-2", name: "Kylle", color: "#5aa9e6" };

describe("serializeCharacters", () => {
  it("maps array index to position and avatarPath to avatar_path", () => {
    const withAvatar: Character = { ...kylle, avatarPath: "user-1/char-2-123.png" };

    expect(serializeCharacters([jaz, withAvatar], projectId)).toEqual([
      { id: "char-1", project_id: projectId, name: "Jaz", color: "#ff7a7a", position: 0, avatar_path: null },
      { id: "char-2", project_id: projectId, name: "Kylle", color: "#5aa9e6", position: 1, avatar_path: "user-1/char-2-123.png" },
    ]);
  });
});

describe("diffCharacters", () => {
  it("returns no changes when nothing differs", () => {
    const rows = serializeCharacters([jaz, kylle], projectId);

    expect(diffCharacters(rows, rows)).toEqual({ upserts: [], deleteIds: [] });
  });

  it("upserts a newly added character", () => {
    const prev = serializeCharacters([jaz], projectId);
    const next = serializeCharacters([jaz, kylle], projectId);

    expect(diffCharacters(prev, next)).toEqual({
      upserts: [next[1]],
      deleteIds: [],
    });
  });

  it("upserts a renamed / recolored character", () => {
    const prev = serializeCharacters([jaz, kylle], projectId);
    const renamed = { ...kylle, name: "K", color: "#000000" };
    const next = serializeCharacters([jaz, renamed], projectId);

    expect(diffCharacters(prev, next)).toEqual({
      upserts: [next[1]],
      deleteIds: [],
    });
  });

  it("deletes a removed character without touching the rest", () => {
    const prev = serializeCharacters([jaz, kylle], projectId);
    const next = serializeCharacters([jaz], projectId);

    expect(diffCharacters(prev, next)).toEqual({
      upserts: [],
      deleteIds: ["char-2"],
    });
  });

  it("upserts both rows on reorder since position changes for each", () => {
    const prev = serializeCharacters([jaz, kylle], projectId);
    const next = serializeCharacters([kylle, jaz], projectId);

    expect(diffCharacters(prev, next)).toEqual({
      upserts: next,
      deleteIds: [],
    });
  });

  it("upserts a character whose avatar_path changed", () => {
    const prev = serializeCharacters([jaz, kylle], projectId);
    const withAvatar = { ...kylle, avatarPath: "user-1/char-2-123.png" };
    const next = serializeCharacters([jaz, withAvatar], projectId);

    expect(diffCharacters(prev, next)).toEqual({
      upserts: [next[1]],
      deleteIds: [],
    });
  });
});
