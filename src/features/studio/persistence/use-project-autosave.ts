"use client";

import { useCallback } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAutosave, type SaveOutcome } from "./use-autosave";
import type { StudioState } from "../types";

type ProjectSnapshot = { title: string; description: string };

function projectSnapshot(state: StudioState): ProjectSnapshot {
  return { title: state.projectName, description: state.projectDescription };
}

/**
 * Third autosave slice (see PRD "Autosave"): project title/description.
 * Delegates timing (debounce, queued writes, retry-on-error) to useAutosave;
 * there's only ever one row to compare, so equality is a plain snapshot
 * comparison rather than character-diff's per-row one, and there's no
 * notion of conflict — that guard is scoped to the episode slice.
 */
export function useProjectAutosave(state: StudioState, projectId: string | undefined) {
  const save = useCallback(async (snapshot: ProjectSnapshot): Promise<SaveOutcome<ProjectSnapshot>> => {
    if (!projectId) return { ok: true };

    const { error } = await getSupabaseBrowserClient()
      .from("projects")
      .update({ title: snapshot.title, description: snapshot.description })
      .eq("id", projectId);

    if (error) return { ok: false };
    return { ok: true };
  }, [projectId]);

  return useAutosave(
    () => projectSnapshot(state),
    (snapshot) => JSON.stringify(snapshot),
    save,
    projectSnapshot(state),
    Boolean(projectId),
  );
}
