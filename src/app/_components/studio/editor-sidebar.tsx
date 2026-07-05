"use client";

import { type ChangeEvent, useId } from "react";
import { motion } from "framer-motion";
import { Upload, Plus, Trash2, Edit2, X } from "lucide-react";

import { cn } from "@/lib/utils";

import { canAddCharacter } from "./anonymous-limits";
import { useStudio } from "./studio-context";
import { CHARACTER_PALETTE } from "./constants";
import { addCharacter, deleteCharacter, toggleEditingCharacter, updateCharacter } from "./studio-actions";
import { Panel, Avatar, standardInput, focusRing, miniLabel } from "./shared-ui";

export function EditorSidebar() {
  return (
    <aside className="h-full w-[340px] shrink-0 overflow-y-auto border-r border-sand-100 bg-white px-5 pt-5 pb-12 [scrollbar-color:#e8ded7_transparent] [scrollbar-width:thin]">
      <ProjectInfo />
      <CastSection />
    </aside>
  );
}

function ProjectInfo() {
  const { state, setState } = useStudio();

  return (
    <div className="flex flex-col gap-1.5 px-1 pt-2 pb-6 mb-2 border-b border-sand-100">
      <input
        aria-label="Project name"
        className={cn(standardInput, "font-display text-[19px] italic text-sand-900 placeholder:text-sand-300 placeholder:not-italic")}
        value={state.projectName}
        onChange={(e) => setState((s) => ({ ...s, projectName: e.target.value }))}
        placeholder="Project Name"
      />
      <input
        aria-label="Project description"
        className={cn(standardInput, "text-[12px] font-medium text-sand-500 placeholder:text-sand-300")}
        value={state.projectDescription}
        onChange={(e) => setState((s) => ({ ...s, projectDescription: e.target.value }))}
        placeholder="Add a description..."
      />
    </div>
  );
}

function CastSection() {
  const { state, setState, isAuthenticated } = useStudio();
  const idPrefix = useId();
  const castIsFull = !canAddCharacter(state.characters.length, isAuthenticated);

  function uploadPhoto(id: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = reader.result;
      if (typeof result === "string") {
        setState((current) => updateCharacter(current, id, { avatar: result }));
      }
    });
    reader.addEventListener("error", () => {
      // Best-effort upload; leave the character's avatar unchanged on read failure.
    });
    reader.readAsDataURL(file);
  }

  return (
    <Panel title="Cast">
      <ul className="m-0 list-none space-y-2 p-0">
        {state.characters.map((character) => {
          const isEditing = state.editingCharacterId === character.id;
          const isOwner = state.ownerId === character.id;
          const photoInputId = `${idPrefix}-${character.id}-photo`;

          return (
            <li key={character.id} className="relative group">
              <div className={cn(
                "flex items-center gap-3 px-2.5 py-2 transition-all relative z-10",
                isEditing
                  ? "rounded-t-xl border border-accent-200 border-b-transparent bg-accent-50/30"
                  : "rounded-xl border border-sand-200 bg-white hover:border-sand-300 hover:shadow-sm"
              )}>
                <Avatar character={character} size="small" />
                <div className="min-w-0 flex-1">
                  <strong className={cn("block truncate text-[13px] font-semibold", isEditing ? "text-accent-900" : "text-sand-900")}>{character.name || "Unnamed"}</strong>
                  {isOwner ? (
                    <span className="mt-1 inline-flex items-center rounded-full bg-accent-900 px-1.5 py-[1px] text-[9px] font-bold tracking-wide text-accent-100 uppercase">
                      This phone
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={cn("flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent text-sand-400 transition-all hover:bg-accent-100 hover:text-accent-600", isEditing && "bg-accent-100 text-accent-600", focusRing)}
                  aria-expanded={isEditing}
                  aria-label="Edit"
                  onClick={() => setState((current) => toggleEditingCharacter(current, character.id))}
                >
                  {isEditing ? <X className="size-3.5" /> : <Edit2 className="size-3.5" />}
                </button>
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
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-sand-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-sand-700 shadow-sm transition-colors hover:bg-accent-50 hover:text-accent-700 hover:border-accent-200 focus-within:ring-2 focus-within:ring-accent-500 focus-within:ring-offset-1" htmlFor={photoInputId}>
                        <Upload className="size-3.5" /> Upload
                        <input
                          id={photoInputId}
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(event) => uploadPhoto(character.id, event)}
                        />
                      </label>
                      {character.avatar && (
                        <button
                          type="button"
                          className={cn("cursor-pointer rounded-lg border border-transparent bg-sand-200/50 px-3 py-1.5 text-[12px] font-semibold text-sand-600 transition-colors hover:bg-sand-200 hover:text-sand-900", focusRing)}
                          onClick={() => setState((current) => updateCharacter(current, character.id, { avatar: undefined }))}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={cn("flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-transparent bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50", focusRing)}
                    disabled={state.characters.length <= 1}
                    onClick={() => setState((current) => deleteCharacter(current, character.id))}
                  >
                    <Trash2 className="size-3.5" /> Delete character
                  </button>
                </motion.div>
              )}
            </li>
          );
        })}
      </ul>
      <button type="button" disabled={castIsFull} className={cn("mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-sand-300 bg-transparent px-3 py-2.5 text-[12px] font-semibold text-sand-500 transition-colors hover:border-accent-400 hover:bg-accent-100/50 hover:text-accent-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-sand-300 disabled:hover:bg-transparent disabled:hover:text-sand-500", focusRing)} onClick={() => setState((current) => addCharacter(current))}>
        <Plus className="size-3.5" /> Add character
      </button>
      {castIsFull ? (
        <p className="mt-2 text-center text-[11px] text-sand-500">Sign in to add more characters.</p>
      ) : null}
    </Panel>
  );
}
