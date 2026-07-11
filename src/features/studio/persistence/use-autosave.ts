"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "saved" | "saving" | "retrying" | "conflict";

export type SaveOutcome<TSnapshot> =
  | { ok: true; next?: TSnapshot }
  | { ok: false; conflict?: boolean };

/**
 * Shared debounce/queue/retry/visibility-flush plumbing behind all three
 * autosave slices (episode doc, character rows, project metadata). A caller
 * owns diffing/serialization and the actual write; this hook owns timing:
 * 800ms debounce, flush-on-tab-hide, a serial save queue (so an edit made
 * mid-save is applied after, using the freshest `previous` value), and
 * indefinite 1s-backoff retry on error. A `conflict` outcome stops retrying
 * for good — matching the episode slice's stale-write guard.
 */
export function useAutosave<TSnapshot>(
  serialize: () => TSnapshot,
  toKey: (snapshot: TSnapshot) => string,
  save: (snapshot: TSnapshot, previous: TSnapshot) => Promise<SaveOutcome<TSnapshot>>,
  initial: TSnapshot,
  enabled: boolean,
): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const savedValue = useRef(initial);
  const savedKey = useRef(toKey(initial));
  const pendingSave = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const generation = useRef(0);
  const hasConflict = useRef(false);
  const saveQueue = useRef(Promise.resolve());
  // Latest-ref pattern: `save`/`toKey` are commonly passed as fresh closures
  // each render, so reading them via refs (rather than depending on their
  // identity) keeps `runSave`/`enqueueSave` stable and the effects below
  // from re-firing — and rescheduling the debounce — on every render.
  const saveRef = useRef(save);
  const toKeyRef = useRef(toKey);
  useEffect(() => {
    saveRef.current = save;
    toKeyRef.current = toKey;
  });

  const runSave = useCallback(async (snapshot: TSnapshot, currentGeneration: number) => {
    if (!enabled) return;
    if (generation.current === currentGeneration) setStatus("saving");

    while (true) {
      const outcome = await saveRef.current(snapshot, savedValue.current);

      if (!outcome.ok) {
        if (outcome.conflict) {
          hasConflict.current = true;
          setStatus("conflict");
          return;
        }
        if (generation.current !== currentGeneration) return;
        setStatus("retrying");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      savedValue.current = outcome.next ?? snapshot;
      savedKey.current = toKeyRef.current(savedValue.current);
      if (generation.current === currentGeneration) setStatus("saved");
      return;
    }
  }, [enabled]);

  const enqueueSave = useCallback((snapshot: TSnapshot, currentGeneration: number) => {
    saveQueue.current = saveQueue.current.then(() => runSave(snapshot, currentGeneration));
  }, [runSave]);

  const snapshot = serialize();
  const key = toKey(snapshot);

  useEffect(() => {
    if (!enabled || key === savedKey.current || hasConflict.current) return;

    const currentGeneration = ++generation.current;
    clearTimeout(pendingSave.current);
    pendingSave.current = setTimeout(() => enqueueSave(snapshot, currentGeneration), 800);

    return () => clearTimeout(pendingSave.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, enqueueSave]);

  useEffect(() => {
    const flushOnHide = () => {
      if (document.visibilityState !== "hidden" || !enabled || key === savedKey.current || hasConflict.current) return;
      clearTimeout(pendingSave.current);
      const currentGeneration = ++generation.current;
      enqueueSave(snapshot, currentGeneration);
    };
    document.addEventListener("visibilitychange", flushOnHide);
    return () => document.removeEventListener("visibilitychange", flushOnHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, enqueueSave]);

  return status;
}
