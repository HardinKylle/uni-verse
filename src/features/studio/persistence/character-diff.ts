/**
 * Pure serialize/diff for the character-row autosave slice. Mirrors the shape
 * of episode-doc.ts's serialize/deserialize split, but for `characters` rows
 * instead of a single JSONB document — see use-character-autosave.ts for the
 * caller that debounces and diffs snapshots on every state change.
 */

import type { Character } from "../types";

export type CharacterRow = {
  id: string;
  project_id: string;
  name: string;
  color: string;
  position: number;
  avatar_path: string | null;
};

/** Array order becomes `position`, so a drag-reorder is just a position change on the moved rows. */
export function serializeCharacters(characters: Character[], projectId: string): CharacterRow[] {
  return characters.map((character, position) => ({
    id: character.id,
    project_id: projectId,
    name: character.name,
    color: character.color,
    position,
    avatar_path: character.avatarPath ?? null,
  }));
}

function rowsEqual(a: CharacterRow, b: CharacterRow): boolean {
  return (
    a.name === b.name &&
    a.color === b.color &&
    a.position === b.position &&
    a.avatar_path === b.avatar_path
  );
}

/** Only rows that are new or changed are upserted; ids dropped from `next` are deleted. */
export function diffCharacters(
  prev: CharacterRow[],
  next: CharacterRow[],
): { upserts: CharacterRow[]; deleteIds: string[] } {
  const prevById = new Map(prev.map((row) => [row.id, row]));
  const nextIds = new Set(next.map((row) => row.id));

  const upserts = next.filter((row) => {
    const previous = prevById.get(row.id);
    return !previous || !rowsEqual(previous, row);
  });
  const deleteIds = prev.filter((row) => !nextIds.has(row.id)).map((row) => row.id);

  return { upserts, deleteIds };
}
