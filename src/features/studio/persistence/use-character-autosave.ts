"use client";

import { useCallback } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { diffCharacters, serializeCharacters, type CharacterRow } from "./character-diff";
import { useAutosave, type SaveOutcome } from "./use-autosave";
import type { StudioState } from "../types";

/**
 * Second autosave slice (see PRD "Autosave"): character rows, diffed against
 * the last-saved snapshot so only added/changed/removed rows are written.
 * Delegates timing (debounce, queued writes, retry-on-error) to useAutosave;
 * this hook owns row diffing/upsert/delete, which has no notion of conflict
 * — that guard is scoped to the episode slice.
 */
export function useCharacterAutosave(state: StudioState, projectId: string | undefined) {
  const save = useCallback(async (rows: CharacterRow[], previous: CharacterRow[]): Promise<SaveOutcome<CharacterRow[]>> => {
    if (!projectId) return { ok: true };

    const { upserts, deleteIds } = diffCharacters(previous, rows);
    if (upserts.length === 0 && deleteIds.length === 0) return { ok: true, next: rows };

    const supabase = getSupabaseBrowserClient();
    const [upsertResult, deleteResult] = await Promise.all([
      upserts.length > 0
        ? supabase.from("characters").upsert(upserts)
        : Promise.resolve({ error: null }),
      deleteIds.length > 0
        ? supabase.from("characters").delete().in("id", deleteIds)
        : Promise.resolve({ error: null }),
    ]);
    const error = upsertResult.error ?? deleteResult.error;
    if (error) return { ok: false };

    // Only once the new avatar_path is confirmed written is it safe to drop
    // the storage object it replaced (or cleared) — deleting eagerly, before
    // this write lands, risks orphaning the DB row's reference if the tab
    // closes or the write fails permanently in between (see use-avatar-upload.ts).
    const previousById = new Map(previous.map((row) => [row.id, row]));
    const staleAvatarPaths = upserts.flatMap((row) => {
      const previousRow = previousById.get(row.id);
      if (!previousRow?.avatar_path || previousRow.avatar_path === row.avatar_path) return [];
      return [previousRow.avatar_path];
    });
    if (staleAvatarPaths.length > 0) {
      void supabase.storage.from("avatars").remove(staleAvatarPaths);
    }

    return { ok: true, next: rows };
  }, [projectId]);

  return useAutosave(
    () => (projectId ? serializeCharacters(state.characters, projectId) : []),
    (rows) => JSON.stringify(rows),
    save,
    projectId ? serializeCharacters(state.characters, projectId) : [],
    Boolean(projectId),
  );
}
