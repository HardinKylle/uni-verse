"use client";

import { useCallback, useRef } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import { serializeEpisode, type EpisodeDocument } from "./episode-doc";
import { useAutosave, type SaveOutcome, type SaveStatus } from "./use-autosave";
import type { StudioState } from "../types";

export type { SaveStatus };

type EpisodeSnapshot = {
  title: string;
  description: string;
  document: EpisodeDocument;
};

function episodeSnapshot(state: StudioState): EpisodeSnapshot {
  return {
    title: state.episodeTitle,
    description: state.episodeDescription,
    document: serializeEpisode(state),
  };
}

export function useEpisodeAutosave(
  state: StudioState,
  episode: { id: string; updatedAt: string } | undefined,
) {
  const updatedAt = useRef(episode?.updatedAt);

  const save = useCallback(async (snapshot: EpisodeSnapshot): Promise<SaveOutcome<EpisodeSnapshot>> => {
    if (!episode || !updatedAt.current) return { ok: true };

    const { data, error } = await getSupabaseBrowserClient()
      .from("episodes")
      .update({
        title: snapshot.title,
        description: snapshot.description,
        script: snapshot.document as unknown as Json,
      })
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
    () => episodeSnapshot(state),
    (snapshot) => JSON.stringify(snapshot),
    save,
    episodeSnapshot(state),
    Boolean(episode),
  );
}
