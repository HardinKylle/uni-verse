"use client";

import { useCallback, useRef } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import { serializeEpisode, type EpisodeDocument } from "./episode-doc";
import { useAutosave, type SaveOutcome, type SaveStatus } from "./use-autosave";
import type { StudioState } from "../types";

export type { SaveStatus };

export function useEpisodeAutosave(
  state: StudioState,
  episode: { id: string; updatedAt: string } | undefined,
) {
  const updatedAt = useRef(episode?.updatedAt);

  const save = useCallback(async (snapshot: EpisodeDocument): Promise<SaveOutcome<EpisodeDocument>> => {
    if (!episode || !updatedAt.current) return { ok: true };

    const { data, error } = await getSupabaseBrowserClient()
      .from("episodes")
      .update({ script: snapshot as unknown as Json })
      .eq("id", episode.id)
      .eq("updated_at", updatedAt.current)
      .select("updated_at")
      .maybeSingle();

    if (error) return { ok: false };
    if (!data) return { ok: false, conflict: true };

    updatedAt.current = data.updated_at;
    return { ok: true };
  }, [episode]);

  return useAutosave(
    () => serializeEpisode(state),
    (snapshot) => JSON.stringify(snapshot),
    save,
    serializeEpisode(state),
    Boolean(episode),
  );
}
