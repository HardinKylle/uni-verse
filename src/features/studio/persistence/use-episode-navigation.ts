"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import type { StudioInitialData, StudioState } from "../types";
import { createEmptyEpisodeDocument } from "./episode-doc";
import type { AutosaveControl } from "./use-autosave";

export function useEpisodeNavigation(
  state: StudioState,
  initialData: StudioInitialData | undefined,
  episodeAutosave: AutosaveControl,
  characterAutosave: AutosaveControl,
) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();

  const flushAutosave = useCallback(async () => {
    const outcomes = await Promise.all([episodeAutosave.flush(), characterAutosave.flush()]);
    return outcomes.every(Boolean);
  }, [characterAutosave, episodeAutosave]);

  const onOpen = useCallback(async (episodeId: string) => {
    if (!initialData || episodeId === initialData.episode.id || isPending) return;

    setIsPending(true);
    setError(undefined);
    if (!await flushAutosave()) {
      setIsPending(false);
      return;
    }

    const firstEpisodeId = initialData.episodes[0]?.id;
    router.push(
      episodeId === firstEpisodeId
        ? `/p/${initialData.projectId}`
        : `/p/${initialData.projectId}?episode=${episodeId}`,
    );
  }, [flushAutosave, initialData, isPending, router]);

  const onCreate = useCallback(async () => {
    if (!initialData || isPending) return;

    setIsPending(true);
    setError(undefined);
    if (!await flushAutosave()) {
      setIsPending(false);
      return;
    }

    const position = Math.max(...initialData.episodes.map((episode) => episode.position), -1) + 1;
    const title = `Episode ${initialData.episodes.length + 1}`;
    const { data, error: createError } = await getSupabaseBrowserClient()
      .from("episodes")
      .insert({
        project_id: initialData.projectId,
        title,
        position,
        script: createEmptyEpisodeDocument(state.characters) as unknown as Json,
      })
      .select("id")
      .single();

    if (createError) {
      setError("Could not create the episode. Try again.");
      setIsPending(false);
      return;
    }

    router.push(`/p/${initialData.projectId}?episode=${data.id}`);
  }, [flushAutosave, initialData, isPending, router, state.characters]);

  return { error, isPending, onCreate, onOpen };
}
