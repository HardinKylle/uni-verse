"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import {
  countCharacterMessages,
  deleteCharacterMessageReferences,
  deleteCharacterWithMessages,
  reassignCharacterReferences,
  removeCharacterFromCast,
  updateEpisodeForCharacterDeletion,
  type CharacterDeletionResolution,
} from "../editor/character-deletion";
import { deserializeEpisode, serializeEpisode, type EpisodeDocument } from "./episode-doc";
import type { AutosaveControl } from "./use-autosave";
import type { Character, StudioInitialData, StudioState } from "../types";

export type CharacterUsage = {
  episodeId: string;
  title: string;
  messageCount: number;
};

type UnloadedEpisodeReference = CharacterUsage & {
  document: EpisodeDocument;
  updatedAt: string;
};

type AppliedEpisodeUpdate = {
  episodeId: string;
  originalDocument: EpisodeDocument;
  updatedAt: string;
};

export type CharacterDeletionPrompt = {
  characterId: string;
  characterName: string;
  fallbackOwnerName: string;
  ownershipEpisodeTitles: string[];
  remainingCharacters: Character[];
  usage: CharacterUsage[];
};

type PendingDeletion = CharacterDeletionPrompt & {
  unloadedEpisodes: UnloadedEpisodeReference[];
  showDialog: boolean;
  resolution?: CharacterDeletionResolution;
  loadedStateBefore?: StudioState;
  appliedEpisodes?: AppliedEpisodeUpdate[];
};

type SaveStage = "loaded-episode" | "character" | undefined;

async function updateEpisodeScript(
  episodeId: string,
  updatedAt: string,
  document: EpisodeDocument,
): Promise<string | undefined> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("episodes")
    .update({ script: document as unknown as Json })
    .eq("id", episodeId)
    .eq("updated_at", updatedAt)
    .select("updated_at")
    .maybeSingle();

  return error ? undefined : data?.updated_at;
}

export type CharacterDeletionControl = {
  prompt: CharacterDeletionPrompt | undefined;
  checkingCharacterId: string | undefined;
  isApplying: boolean;
  error: string | undefined;
  requestDelete: (characterId: string) => void;
  cancel: () => void;
  reassign: (targetId: string) => void;
  deleteMessages: () => void;
};

export function useCharacterDeletion({
  state,
  setState,
  initialData,
  episodeAutosave,
  characterAutosave,
}: {
  state: StudioState;
  setState: Dispatch<SetStateAction<StudioState>>;
  initialData: StudioInitialData | undefined;
  episodeAutosave: AutosaveControl;
  characterAutosave: AutosaveControl;
}): CharacterDeletionControl {
  const stateRef = useRef(state);
  const [pending, setPending] = useState<PendingDeletion>();
  const [checkingCharacterId, setCheckingCharacterId] = useState<string>();
  const [isApplying, setIsApplying] = useState(false);
  const [saveStage, setSaveStage] = useState<SaveStage>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const flushCurrentWork = useCallback(async () => {
    const saved = await Promise.all([episodeAutosave.flush(), characterAutosave.flush()]);
    return saved.every(Boolean);
  }, [characterAutosave, episodeAutosave]);

  const rollbackUnloadedEpisodes = useCallback(async (
    appliedEpisodes: AppliedEpisodeUpdate[],
  ): Promise<boolean> => {
    let rolledBack = true;

    for (const episode of [...appliedEpisodes].reverse()) {
      const updatedAt = await updateEpisodeScript(
        episode.episodeId,
        episode.updatedAt,
        episode.originalDocument,
      );
      if (!updatedAt) rolledBack = false;
    }

    return rolledBack;
  }, []);

  useEffect(() => {
    if (!saveStage || !pending?.resolution || !pending.loadedStateBefore) return;

    let cancelled = false;
    const finishStage = async () => {
      if (saveStage === "loaded-episode") {
        const saved = await episodeAutosave.flush();
        if (cancelled) return;

        if (!saved) {
          const rolledBack = await rollbackUnloadedEpisodes(pending.appliedEpisodes ?? []);
          if (cancelled) return;
          setState(pending.loadedStateBefore!);
          setPending((current) => current
            ? {
                ...current,
                resolution: undefined,
                loadedStateBefore: undefined,
                appliedEpisodes: undefined,
              }
            : current);
          setError(
            rolledBack
              ? "The loaded episode changed elsewhere. Nothing was deleted; reload before trying again."
              : "The loaded episode changed elsewhere, and some earlier updates could not be restored. Reload before continuing.",
          );
          setIsApplying(false);
          setSaveStage(undefined);
          return;
        }

        setState((current) => removeCharacterFromCast(current, pending.characterId));
        setSaveStage("character");
        return;
      }

      const saved = await characterAutosave.flush();
      if (cancelled) return;
      if (!saved) {
        setError("Could not remove the character. Reload before continuing.");
      }
      setPending(undefined);
      setIsApplying(false);
      setSaveStage(undefined);
    };
    void finishStage();

    return () => {
      cancelled = true;
    };
    // Each named stage captures the autosave control from the render containing
    // that stage's state transition. Status-only rerenders must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveStage]);

  const applyResolution = useCallback(async (
    resolution: CharacterDeletionResolution,
    deletion: PendingDeletion | undefined = pending,
  ) => {
    if (!deletion || isApplying) return;

    setIsApplying(true);
    setError(undefined);
    const fallbackId = deletion.remainingCharacters[0].id;
    const appliedEpisodes: AppliedEpisodeUpdate[] = [];

    for (const episode of deletion.unloadedEpisodes) {
      const document = updateEpisodeForCharacterDeletion(
        episode.document,
        deletion.characterId,
        resolution,
        fallbackId,
      );
      const updatedAt = await updateEpisodeScript(
        episode.episodeId,
        episode.updatedAt,
        document,
      );

      if (!updatedAt) {
        const rolledBack = await rollbackUnloadedEpisodes(appliedEpisodes);
        setError(
          rolledBack
            ? `${episode.title} changed elsewhere. Nothing was deleted; reload before trying again.`
            : `${episode.title} changed elsewhere, and some earlier updates could not be restored. Reload before continuing.`,
        );
        setIsApplying(false);
        return;
      }

      appliedEpisodes.push({
        episodeId: episode.episodeId,
        originalDocument: episode.document,
        updatedAt,
      });
    }

    const loadedStateBefore = stateRef.current;
    setPending({
      ...deletion,
      resolution,
      loadedStateBefore,
      appliedEpisodes,
    });
    setState((current) =>
      resolution.type === "reassign"
        ? reassignCharacterReferences(
            current,
            deletion.characterId,
            resolution.targetId,
          )
        : deleteCharacterMessageReferences(current, deletion.characterId),
    );
    setSaveStage("loaded-episode");
  }, [isApplying, pending, rollbackUnloadedEpisodes, setState]);

  const requestDelete = useCallback(async (characterId: string) => {
    const initialState = stateRef.current;
    if (
      initialState.characters.length <= 2 ||
      !initialState.characters.some(({ id }) => id === characterId) ||
      checkingCharacterId
    ) {
      return;
    }

    setCheckingCharacterId(characterId);
    setError(undefined);

    if (initialData && !await flushCurrentWork()) {
      setError("Save the current changes before deleting a character.");
      setCheckingCharacterId(undefined);
      return;
    }

    const currentState = stateRef.current;
    const character = currentState.characters.find(({ id }) => id === characterId);
    if (!character || currentState.characters.length <= 2) {
      setCheckingCharacterId(undefined);
      return;
    }

    let unloadedEpisodes: UnloadedEpisodeReference[] = [];
    if (initialData) {
      const supabase = getSupabaseBrowserClient();
      const referencedEpisodes = (containment: Record<string, unknown>) =>
        supabase
          .from("episodes")
          .select("id, title, position, script, updated_at")
          .eq("project_id", initialData.projectId)
          .neq("id", initialData.episode.id)
          .contains("script", containment)
          .order("position");
      const results = await Promise.all([
        referencedEpisodes({ messages: [{ senderId: characterId }] }),
        referencedEpisodes({ ownerId: characterId }),
        referencedEpisodes({ activeSenderId: characterId }),
      ]);

      if (results.some((result) => result.error)) {
        setError("Could not check the other episodes. Try again.");
        setCheckingCharacterId(undefined);
        return;
      }

      const episodesById = new Map(
        results.flatMap(({ data }) => data ?? []).map((episode) => [episode.id, episode]),
      );
      unloadedEpisodes = [...episodesById.values()]
        .sort((left, right) => left.position - right.position)
        .map((episode) => {
          const document = serializeEpisode(
            deserializeEpisode(episode.script, currentState.characters),
          );
          return {
            episodeId: episode.id,
            title: episode.title,
            messageCount: countCharacterMessages(document.messages, characterId),
            document,
            updatedAt: episode.updated_at,
          };
        });
    }

    const loadedMessageCount = countCharacterMessages(currentState.messages, characterId);
    const usage = [
      ...(loadedMessageCount > 0
        ? [{
            episodeId: initialData?.episode.id ?? "current",
            title: currentState.episodeTitle,
            messageCount: loadedMessageCount,
          }]
        : []),
      ...unloadedEpisodes.filter(({ messageCount }) => messageCount > 0),
    ];
    const ownershipEpisodeTitles = [
      ...(currentState.ownerId === characterId ? [currentState.episodeTitle] : []),
      ...unloadedEpisodes
        .filter(({ document }) => document.ownerId === characterId)
        .map(({ title }) => title),
    ];
    const loadedEpisodeReferencesCharacter =
      loadedMessageCount > 0 ||
      currentState.ownerId === characterId ||
      currentState.activeSenderId === characterId;

    if (!loadedEpisodeReferencesCharacter && unloadedEpisodes.length === 0) {
      setState((current) => deleteCharacterWithMessages(current, characterId));
      setCheckingCharacterId(undefined);
      return;
    }

    const remainingCharacters = currentState.characters.filter(({ id }) => id !== characterId);
    const deletion: PendingDeletion = {
      characterId,
      characterName: character.name || "Unnamed character",
      fallbackOwnerName: remainingCharacters[0].name || "the first remaining character",
      ownershipEpisodeTitles,
      remainingCharacters,
      usage,
      unloadedEpisodes,
      showDialog: usage.length > 0 || ownershipEpisodeTitles.length > 0,
    };
    setPending(deletion);
    setCheckingCharacterId(undefined);

    if (!deletion.showDialog) {
      void applyResolution({ type: "delete-messages" }, deletion);
    }
  }, [
    applyResolution,
    checkingCharacterId,
    flushCurrentWork,
    initialData,
    setState,
  ]);

  return {
    prompt: pending?.showDialog ? pending : undefined,
    checkingCharacterId,
    isApplying,
    error,
    requestDelete: (characterId) => {
      void requestDelete(characterId);
    },
    cancel: () => {
      if (isApplying) return;
      setPending(undefined);
      setError(undefined);
    },
    reassign: (targetId) => {
      void applyResolution({ type: "reassign", targetId });
    },
    deleteMessages: () => {
      void applyResolution({ type: "delete-messages" });
    },
  };
}
