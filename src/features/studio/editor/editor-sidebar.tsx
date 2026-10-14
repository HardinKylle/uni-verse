"use client";

import { type ChangeEvent, useId, useState } from "react";
import { AlertDialog, Button } from "@heroui/react";
import { motion } from "framer-motion";
import { Upload, Plus, Trash2, Edit2, X, GripVertical, LoaderCircle } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "@/lib/utils";

import { canAddCharacter } from "../limits/anonymous-limits";
import { useStudio } from "../studio-context";
import { AVATAR_MIME_TYPES, CHARACTER_PALETTE } from "../constants";
import { useAvatarUpload } from "../persistence/use-avatar-upload";
import type {
  CharacterDeletionControl,
  CharacterDeletionPrompt,
} from "../persistence/use-character-deletion";
import { addCharacter, reorderCharacters, toggleEditingCharacter, updateCharacter } from "./studio-actions";
import {
  Panel,
  Avatar,
  CustomSelect,
  standardInput,
  focusRing,
  miniLabel,
} from "../ui/shared-ui";
import type { Character, EpisodeSummary } from "../types";

type EpisodeNavigation = {
  activeId: string;
  episodes: EpisodeSummary[];
  isPending: boolean;
  error: string | undefined;
  onCreate: () => void;
  onOpen: (episodeId: string) => void;
};

export function EditorSidebar({
  characterDeletion,
  episode,
}: {
  characterDeletion: CharacterDeletionControl;
  episode?: EpisodeNavigation;
}) {
  return (
    <aside className="h-full w-[15rem] shrink-0 overflow-y-auto border-r border-sand-100 bg-white px-4 pt-5 pb-12 [scrollbar-color:#e8ded7_transparent] [scrollbar-width:thin] xl:w-[18rem] 2xl:w-[21.25rem]">
      <EpisodeInfo episode={episode} />
      <CastSection characterDeletion={characterDeletion} />
    </aside>
  );
}

function EpisodeInfo({ episode }: { episode?: EpisodeNavigation }) {
  const { state } = useStudio();

  if (!episode) {
    return (
      <div className="mb-6 flex flex-col gap-1.5 border-b border-sand-100 px-1 pt-2 pb-6">
        <EpisodeMetadata />
      </div>
    );
  }

  const hasOtherEpisodes = episode.episodes.length > 1;

  return (
    <nav aria-label="Episodes" className="mb-6 border-b border-sand-100 pb-6">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="font-mono text-[0.6562rem] font-medium tracking-[0.05em] text-sand-800 uppercase">
          Episodes
        </h2>
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          aria-label="New episode"
          isDisabled={episode.isPending}
          onPress={episode.onCreate}
        >
          {episode.isPending
            ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
            : <Plus className="size-3.5" aria-hidden />}
        </Button>
      </div>

      {/* The active episode's title and description live together in one card so
          the description reads as belonging to the episode being edited — not to
          the switcher below, which only jumps to a different episode. */}
      <div className="rounded-lg border border-accent-200 bg-accent-50/40 px-3 py-2.5">
        <span className="sr-only">Current episode</span>
        <EpisodeTitleInput className="h-8 border-0 bg-transparent px-0 text-[1.0625rem] shadow-none hover:bg-transparent focus:bg-transparent focus:shadow-none focus:ring-0" />
        <EpisodeDescriptionInput className="border-0 bg-transparent px-0 shadow-none hover:bg-transparent focus:bg-transparent focus:shadow-none focus:ring-0" />
      </div>

      {/* Compact switcher instead of an unbounded list: scales to any number of
          episodes without pushing the cast section off-screen. */}
      {hasOtherEpisodes ? (
        <div className="mt-3">
          <CustomSelect
            label="Switch episode"
            value={episode.activeId}
            options={episode.episodes.map((item) => ({
              value: item.id,
              label: (item.id === episode.activeId ? state.episodeTitle : item.title) || "Untitled episode",
            }))}
            isDisabled={episode.isPending}
            onChange={(id) => {
              if (id !== episode.activeId) episode.onOpen(id);
            }}
          />
        </div>
      ) : null}

      {episode.error ? <p role="alert" className="mt-2 text-[0.6875rem] font-medium text-red-600">{episode.error}</p> : null}
    </nav>
  );
}

function EpisodeMetadata() {
  return (
    <>
      <EpisodeTitleInput className="text-[1.1875rem] placeholder:not-italic" />
      <EpisodeDescriptionInput />
    </>
  );
}

function EpisodeTitleInput({ className }: { className?: string }) {
  const { state, setState } = useStudio();

  return (
    <input
      aria-label="Episode title"
      className={cn(
        standardInput,
        "font-display italic text-sand-900 placeholder:text-sand-300",
        className,
      )}
      value={state.episodeTitle}
      onChange={(event) => setState((current) => ({ ...current, episodeTitle: event.target.value }))}
      placeholder="Episode title"
    />
  );
}

function EpisodeDescriptionInput({ className }: { className?: string }) {
  const { state, setState } = useStudio();

  return (
    <input
      aria-label="Episode description"
      className={cn(
        standardInput,
        "text-[0.75rem] font-medium text-sand-500 placeholder:text-sand-300",
        className,
      )}
      value={state.episodeDescription}
      onChange={(event) => setState((current) => ({
        ...current,
        episodeDescription: event.target.value,
      }))}
      placeholder="Describe this episode..."
    />
  );
}

function CastSection({
  characterDeletion,
}: {
  characterDeletion: CharacterDeletionControl;
}) {
  const { state, setState, isAuthenticated, userId } = useStudio();
  const idPrefix = useId();
  const castIsFull = !canAddCharacter(state.characters.length, isAuthenticated);
  const { errors: uploadErrors, uploadPhoto: uploadPhotoFile, removePhoto } = useAvatarUpload(
    userId,
    state.characters,
    setState,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function uploadPhoto(id: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    void uploadPhotoFile(id, file);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setState((current) => reorderCharacters(current, String(active.id), String(over.id)));
    }
  }

  return (
    <Panel title="Cast">
      <DndContext id="cast-list-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={state.characters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <ul className="m-0 list-none space-y-2 p-0">
            {state.characters.map((character) => (
              <SortableCastItem
                key={character.id}
                character={character}
                idPrefix={idPrefix}
                uploadError={uploadErrors[character.id]}
                onUploadPhoto={uploadPhoto}
                onRemovePhoto={removePhoto}
                characterDeletion={characterDeletion}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <Button
        variant="outline"
        size="sm"
        fullWidth
        className="mt-3 border-dashed"
        isDisabled={castIsFull}
        onPress={() => setState((current) => addCharacter(current))}
      >
        <Plus className="size-3.5" /> Add character
      </Button>
      {castIsFull ? (
        <p className="mt-2 text-center text-[0.6875rem] text-sand-500">Sign in to add more characters.</p>
      ) : null}
      {characterDeletion.error && !characterDeletion.prompt ? (
        <p role="alert" className="mt-2 text-center text-[0.6875rem] font-medium text-red-600">
          {characterDeletion.error}
        </p>
      ) : null}
      {characterDeletion.prompt ? (
        <CharacterDeletionDialog
          key={characterDeletion.prompt.characterId}
          deletion={characterDeletion}
          prompt={characterDeletion.prompt}
        />
      ) : null}
    </Panel>
  );
}

function SortableCastItem({
  character,
  idPrefix,
  uploadError,
  onUploadPhoto,
  onRemovePhoto,
  characterDeletion,
}: {
  character: Character;
  idPrefix: string;
  uploadError: string | undefined;
  onUploadPhoto: (id: string, event: ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (id: string) => void;
  characterDeletion: CharacterDeletionControl;
}) {
  const { state, setState } = useStudio();
  const isEditing = state.editingCharacterId === character.id;
  const isOwner = state.ownerId === character.id;
  const photoInputId = `${idPrefix}-${character.id}-photo`;
  const minimumCastDescriptionId = `${idPrefix}-${character.id}-minimum-cast`;
  const isMinimumCast = state.characters.length <= 2;
  const isChecking = characterDeletion.checkingCharacterId === character.id;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: character.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { zIndex: 50, position: "relative" as const } : {}),
  };

  return (
    <li ref={setNodeRef} style={style} className={cn("relative group", isDragging && "opacity-90")}>
      <div className={cn(
        "flex items-center gap-1.5 px-2.5 py-2 transition-all relative z-10",
        isEditing
          ? "rounded-t-xl border border-accent-200 border-b-transparent bg-accent-50/30"
          : "rounded-xl border border-sand-200 bg-white hover:border-sand-300 hover:shadow-sm"
      )}>
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded text-sand-300 transition-colors hover:text-accent-500 opacity-0 group-hover:opacity-100",
            isDragging ? "cursor-grabbing text-accent-500 opacity-100" : "cursor-grab",
          )}
          aria-label={`Reorder ${character.name || "character"}`}
        >
          <GripVertical className="size-3.5" />
        </div>
        <Avatar character={character} size="small" />
        <div className="min-w-0 flex-1">
          <strong className={cn("block truncate text-[0.8125rem] font-semibold", isEditing ? "text-accent-900" : "text-sand-900")}>{character.name || "Unnamed"}</strong>
          {isOwner ? (
            <span className="mt-1 inline-flex items-center rounded-full bg-accent-900 px-1.5 py-[0.0625rem] text-[0.5625rem] font-bold tracking-wide text-accent-100 uppercase">
              This phone
            </span>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          className={cn("shrink-0", isEditing && "bg-accent-100 text-accent-600")}
          aria-expanded={isEditing}
          aria-label="Edit"
          onPress={() => setState((current) => toggleEditingCharacter(current, character.id))}
        >
          {isEditing ? <X className="size-3.5" /> : <Edit2 className="size-3.5" />}
        </Button>
      </div>

      {isEditing && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-b-xl border border-t-0 border-accent-200 bg-accent-50/30 p-4 pt-4 z-0"
        >
          <label className="sr-only" htmlFor={`${idPrefix}-${character.id}-name`}>
            Character name
          </label>
          <input
            id={`${idPrefix}-${character.id}-name`}
            className={cn(standardInput, "mb-4 font-medium bg-white")}
            value={character.name}
            onChange={(event) =>
              setState((current) => updateCharacter(current, character.id, { name: event.target.value }))
            }
            placeholder="Character name"
          />

          <fieldset className="m-0 border-0 p-0 mb-4">
            <legend className={miniLabel}>Color</legend>
            <div className="flex flex-wrap gap-2">
              {CHARACTER_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn("size-6 shrink-0 cursor-pointer rounded-full border-[2.5px] border-transparent shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] transition-all hover:scale-110 active:scale-95 aria-pressed:scale-110 aria-pressed:ring-2 aria-pressed:ring-accent-900 aria-pressed:ring-offset-2", focusRing)}
                  style={{ backgroundColor: color }}
                  aria-label={`Use color ${color}`}
                  aria-pressed={character.color === color}
                  onClick={() => setState((current) => updateCharacter(current, character.id, { color }))}
                />
              ))}
            </div>
          </fieldset>

          <div className="mb-4">
            <p className={miniLabel}>Profile photo</p>
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-sand-200 bg-white px-3 py-1.5 text-[0.75rem] font-semibold text-sand-700 shadow-sm transition-colors hover:bg-accent-50 hover:text-accent-700 hover:border-accent-200 focus-within:ring-2 focus-within:ring-accent-500 focus-within:ring-offset-1" htmlFor={photoInputId}>
                <Upload className="size-3.5" /> Upload
                <input
                  id={photoInputId}
                  type="file"
                  accept={AVATAR_MIME_TYPES.join(",")}
                  className="sr-only"
                  onChange={(event) => onUploadPhoto(character.id, event)}
                />
              </label>
              {character.avatar && (
                <Button variant="secondary" size="sm" onPress={() => onRemovePhoto(character.id)}>
                  Remove
                </Button>
              )}
            </div>
            <p className="mt-1.5 text-[0.6875rem] text-sand-500">PNG, JPEG, WebP, GIF, or AVIF. Max 2MB.</p>
            {uploadError ? (
              <p className="mt-1.5 text-[0.6875rem] font-medium text-red-600">{uploadError}</p>
            ) : null}
          </div>

          <Button
            variant="danger-soft"
            size="sm"
            fullWidth
            isDisabled={isMinimumCast || Boolean(characterDeletion.checkingCharacterId)}
            aria-describedby={isMinimumCast ? minimumCastDescriptionId : undefined}
            onPress={() => characterDeletion.requestDelete(character.id)}
          >
            {isChecking
              ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
              : <Trash2 className="size-3.5" />}
            {isChecking ? "Checking usage…" : "Delete character"}
          </Button>
          {isMinimumCast ? (
            <p
              id={minimumCastDescriptionId}
              className="mt-2 text-center text-[0.6875rem] text-sand-500"
            >
              A story needs at least two characters.
            </p>
          ) : null}
        </motion.div>
      )}
    </li>
  );
}

function CharacterDeletionDialog({
  deletion,
  prompt,
}: {
  deletion: CharacterDeletionControl;
  prompt: CharacterDeletionPrompt;
}) {
  const [targetId, setTargetId] = useState(prompt.remainingCharacters[0].id);

  return (
    <AlertDialog
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) deletion.cancel();
      }}
    >
      <Button className="hidden" aria-hidden />
      <AlertDialog.Backdrop>
        <AlertDialog.Container placement="center" size="md">
          <AlertDialog.Dialog>
            <Button
              className="absolute top-3 right-3 z-10"
              variant="ghost"
              size="sm"
              isIconOnly
              isDisabled={deletion.isApplying}
              aria-label="Close delete dialog"
              onPress={deletion.cancel}
            >
              <X className="size-4" aria-hidden />
            </Button>
            <AlertDialog.Header>
              <AlertDialog.Heading className="pr-10">
                Delete {prompt.characterName}?
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              {prompt.usage.length > 0 ? (
                <>
                  <p>
                    {prompt.characterName} has messages in {prompt.usage.length}{" "}
                    {prompt.usage.length === 1 ? "episode" : "episodes"}. Choose what happens to them.
                  </p>
                  <ul className="my-4 space-y-2">
                    {prompt.usage.map((episode) => (
                      <li
                        key={episode.episodeId}
                        className="flex items-center justify-between gap-6 rounded-lg bg-sand-50 px-3 py-2"
                      >
                        <span className="truncate font-medium text-sand-800">{episode.title}</span>
                        <span className="shrink-0 text-xs text-sand-500">
                          {episode.messageCount} {episode.messageCount === 1 ? "message" : "messages"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {prompt.ownershipEpisodeTitles.length > 0 ? (
                <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {prompt.characterName} is currently &ldquo;me&rdquo; in{" "}
                  {prompt.ownershipEpisodeTitles.join(", ")}. Deleting them transfers the phone
                  to {prompt.fallbackOwnerName}, or to the character you choose below. Their
                  bubbles will switch sides.
                </p>
              ) : null}
              <CustomSelect
                label="Reassign messages to"
                value={targetId}
                options={prompt.remainingCharacters.map((character) => ({
                  value: character.id,
                  label: character.name || "Unnamed character",
                  color: character.color,
                }))}
                isDisabled={deletion.isApplying}
                onChange={setTargetId}
              />
              {deletion.error ? (
                <p role="alert" className="mt-3 text-sm font-medium text-red-600">
                  {deletion.error}
                </p>
              ) : deletion.isApplying ? (
                <p role="status" className="mt-3 text-sm font-medium text-sand-600">
                  Updating episodes…
                </p>
              ) : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                variant="ghost"
                isDisabled={deletion.isApplying}
                onPress={deletion.cancel}
              >
                Cancel
              </Button>
              <Button
                variant="danger-soft"
                isDisabled={deletion.isApplying}
                onPress={deletion.deleteMessages}
              >
                Delete messages and character
              </Button>
              <Button
                variant="primary"
                isDisabled={deletion.isApplying}
                onPress={() => deletion.reassign(targetId)}
              >
                Reassign and delete
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
