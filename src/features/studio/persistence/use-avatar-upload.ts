"use client";

import { useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES, AVATAR_TYPE_ERROR } from "../constants";
import { updateCharacter } from "../editor/studio-actions";
import type { Character, StudioState } from "../types";

/** Derive the extension from the allowed MIME type, not a user-supplied filename. */
function avatarExtension(file: File): string {
  const subtype = file.type.split("/")[1];
  return subtype === "jpeg" ? "jpg" : subtype;
}

/**
 * Owns avatar upload/remove for the cast: validation, the anonymous
 * FileReader-base64 path, and the authenticated optimistic-blob-URL +
 * Supabase Storage upload path (with rollback on failure).
 *
 * This hook never deletes the *previous* storage object itself — that only
 * happens once `useCharacterAutosave` confirms the new `avatar_path` has
 * actually been written to the DB (see its `save()`), so a tab close or a
 * permanently-failed write never leaves the DB pointing at a deleted object.
 */
export function useAvatarUpload(
  userId: string | undefined,
  characters: Character[],
  setState: (updater: (state: StudioState) => StudioState) => void,
) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Per-character operation token: bumped at the start of every uploadPhoto/
  // removePhoto call, so a stale in-flight operation's completion can detect
  // it's been superseded (e.g. a second upload, or a remove, started for the
  // same character before the first upload's network round-trip resolved)
  // and become a no-op instead of reviving state the user already discarded.
  const operations = useRef<Record<string, number>>({});

  function beginOperation(characterId: string): number {
    const token = (operations.current[characterId] ?? 0) + 1;
    operations.current[characterId] = token;
    return token;
  }

  function isCurrentOperation(characterId: string, token: number): boolean {
    return operations.current[characterId] === token;
  }

  function setError(id: string, message: string | undefined) {
    setErrors((current) => {
      if (message === undefined) {
        if (!(id in current)) return current;
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: message };
    });
  }

  async function uploadPhoto(characterId: string, file: File) {
    setError(characterId, undefined);

    if (!AVATAR_MIME_TYPES.includes(file.type)) {
      setError(characterId, AVATAR_TYPE_ERROR);
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError(characterId, "Image is too large (max 2MB).");
      return;
    }

    const token = beginOperation(characterId);

    if (!userId) {
      // Anonymous / demo mode stays in-memory: no bucket to upload to.
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        if (!isCurrentOperation(characterId, token)) return;
        const result = reader.result;
        if (typeof result === "string") {
          setState((current) => updateCharacter(current, characterId, { avatar: result }));
        }
      });
      reader.addEventListener("error", () => {
        if (!isCurrentOperation(characterId, token)) return;
        setError(characterId, "Couldn't read that file.");
      });
      reader.readAsDataURL(file);
      return;
    }

    const previous = characters.find((character) => character.id === characterId);
    const objectUrl = URL.createObjectURL(file);
    setState((current) => updateCharacter(current, characterId, { avatar: objectUrl }));

    // Every path is already unique (timestamp-suffixed), so this is always a
    // fresh insert — upsert:true is deliberately not used: Storage's upsert
    // path performs an INSERT ... ON CONFLICT DO UPDATE, which needs a SELECT
    // policy to evaluate the conflict target under RLS; without one (reads
    // here go through the public bucket flag instead) it fails outright.
    const path = `${userId}/${characterId}-${Date.now()}.${avatarExtension(file)}`;
    const { error } = await getSupabaseBrowserClient()
      .storage.from("avatars")
      .upload(path, file, { contentType: file.type });

    if (!isCurrentOperation(characterId, token)) {
      // A newer upload or a remove started for this character while this one
      // was in flight — don't touch state, and don't leave the just-uploaded
      // object (if it succeeded) orphaned with nothing ever referencing it.
      URL.revokeObjectURL(objectUrl);
      if (!error) void getSupabaseBrowserClient().storage.from("avatars").remove([path]);
      return;
    }

    if (error) {
      setState((current) =>
        updateCharacter(current, characterId, { avatar: previous?.avatar, avatarPath: previous?.avatarPath }),
      );
      setError(characterId, "Upload failed. Try again.");
      URL.revokeObjectURL(objectUrl);
      return;
    }

    const { data } = getSupabaseBrowserClient().storage.from("avatars").getPublicUrl(path);
    setState((current) => updateCharacter(current, characterId, { avatar: data.publicUrl, avatarPath: path }));
    URL.revokeObjectURL(objectUrl);
  }

  function removePhoto(characterId: string) {
    beginOperation(characterId);
    setState((current) => updateCharacter(current, characterId, { avatar: undefined, avatarPath: undefined }));
  }

  return { errors, uploadPhoto, removePhoto };
}
