"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import { serializeEpisode } from "./episode-doc";
import type { StudioState } from "../types";

export type SaveStatus = "saved" | "saving" | "retrying" | "conflict";

export function useEpisodeAutosave(
  state: StudioState,
  episode: { id: string; updatedAt: string } | undefined,
) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const savedSnapshot = useRef(JSON.stringify(serializeEpisode(state)));
  const updatedAt = useRef(episode?.updatedAt);
  const pendingSave = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const generation = useRef(0);
  const hasConflict = useRef(false);
  const saveQueue = useRef(Promise.resolve());

  const save = useCallback(async (snapshot: string, currentGeneration: number) => {
    if (!episode || !updatedAt.current) return;
    if (generation.current === currentGeneration) setStatus("saving");

    while (true) {
      const { data, error } = await getSupabaseBrowserClient()
        .from("episodes")
        .update({ script: JSON.parse(snapshot) as Json })
        .eq("id", episode.id)
        .eq("updated_at", updatedAt.current)
        .select("updated_at")
        .maybeSingle();

      if (error) {
        if (generation.current !== currentGeneration) return;
        setStatus("retrying");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      if (!data) {
        hasConflict.current = true;
        setStatus("conflict");
        return;
      }

      updatedAt.current = data.updated_at;
      savedSnapshot.current = snapshot;
      if (generation.current === currentGeneration) setStatus("saved");
      return;
    }
  }, [episode]);

  const enqueueSave = useCallback((nextSnapshot: string, currentGeneration: number) => {
    saveQueue.current = saveQueue.current.then(() => save(nextSnapshot, currentGeneration));
  }, [save]);

  const snapshot = JSON.stringify(serializeEpisode(state));

  useEffect(() => {
    if (!episode || snapshot === savedSnapshot.current || hasConflict.current) return;

    const currentGeneration = ++generation.current;
    clearTimeout(pendingSave.current);
    pendingSave.current = setTimeout(() => enqueueSave(snapshot, currentGeneration), 800);

    return () => clearTimeout(pendingSave.current);
  }, [enqueueSave, episode, snapshot]);

  useEffect(() => {
    const flushOnHide = () => {
      if (document.visibilityState !== "hidden" || snapshot === savedSnapshot.current) return;
      clearTimeout(pendingSave.current);
      const currentGeneration = ++generation.current;
      enqueueSave(snapshot, currentGeneration);
    };
    document.addEventListener("visibilitychange", flushOnHide);
    return () => document.removeEventListener("visibilitychange", flushOnHide);
  }, [enqueueSave, snapshot]);

  return status;
}
