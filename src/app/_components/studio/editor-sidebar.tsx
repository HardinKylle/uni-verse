"use client";

import { type ChangeEvent, useId } from "react";

import { cn } from "@/lib/utils";

import { useStudio } from "./studio-context";
import type {
  BubbleColor,
  Character,
  DeliveryStatus,
  Meridiem,
} from "./types";

const palette = [
  "#ff7a7a",
  "#5aa9e6",
  "#ffb020",
  "#5bc98c",
  "#b07cff",
  "#ff8fc7",
  "#3fc7c9",
  "#f0894e",
  "#9aa0ff",
  "#e0607e",
];

const initials = (name: string) => name.trim().charAt(0).toUpperCase() || "?";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d44d5c]";
const standardInput = cn(
  "w-full rounded-[9px] border border-[#ead2c9] bg-[#fbf4f0] px-2.5 py-2 text-[13px] text-[#2b1520] placeholder:text-[#c29aa0] focus:border-[#d44d5c] focus:bg-white focus:outline-none",
  focusRing,
);
const miniLabel = "mb-[7px] block text-[10px] font-bold tracking-[0.05em] text-[#ad8791] uppercase";

export function EditorSidebar() {
  return (
    <aside className="h-full w-[376px] shrink-0 overflow-y-auto border-r border-black/7 bg-[#f5e9e2] px-4 pt-[18px] pb-12 [scrollbar-color:#d9b7ac_transparent] [scrollbar-width:thin]">
      <Brand />
      <CastSection />
      <SenderSection />
      <ScreenSettings />
    </aside>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-[11px] px-1 pt-0.5 pb-4">
      <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-linear-[150deg,#d44d5ccc,#d44d5c] text-lg text-white" aria-hidden="true">
        ✦
      </div>
      <div>
        <h1 className="m-0 text-base font-extrabold tracking-[-0.01em]">AU Studio</h1>
        <p className="mt-px text-[11px] font-semibold text-[#ad8791]">iMessage skin · episode editor</p>
      </div>
    </div>
  );
}

function CastSection() {
  const { state, setState } = useStudio();
  const idPrefix = useId();

  function updateCharacter(id: string, update: Partial<Character>) {
    setState((current) => ({
      ...current,
      characters: current.characters.map((character) =>
        character.id === id ? { ...character, ...update } : character,
      ),
    }));
  }

  function addCharacter() {
    setState((current) => {
      const usedColors = new Set(current.characters.map(({ color }) => color));
      const color =
        palette.find((candidate) => !usedColors.has(candidate)) ??
        palette[current.characters.length % palette.length];
      const id = `c-${crypto.randomUUID()}`;

      return {
        ...current,
        characters: [...current.characters, { id, name: "New", color }],
        editingCharacterId: id,
        activeSenderId: id,
      };
    });
  }

  function deleteCharacter(id: string) {
    setState((current) => {
      if (current.characters.length <= 1) return current;

      const characters = current.characters.filter(({ id: value }) => value !== id);
      const replacementId = characters[0].id;
      return {
        ...current,
        characters,
        messages: current.messages.map((message) =>
          message.senderId === id
            ? { ...message, senderId: replacementId }
            : message,
        ),
        ownerId: current.ownerId === id ? replacementId : current.ownerId,
        activeSenderId:
          current.activeSenderId === id ? replacementId : current.activeSenderId,
        editingCharacterId: null,
      };
    });
  }

  function uploadPhoto(id: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        updateCharacter(id, { avatar: reader.result });
      }
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
            <li key={character.id}>
              <div className="flex items-center gap-2.5 rounded-xl border border-[#ebd6ce] bg-[#fbf4f0] px-2 py-[7px]">
                <Avatar character={character} size="small" />
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-semibold">{character.name || "Unnamed"}</strong>
                  {isOwner ? <span className="mt-px block text-[11px] font-semibold text-[#d44d5c]">◉ this phone · blue side</span> : null}
                </div>
                <button
                  type="button"
                  className={cn("cursor-pointer rounded-lg border border-[#ead2c9] bg-white px-2.5 py-[5px] text-xs font-semibold text-[#6e4a54]", focusRing)}
                  aria-expanded={isEditing}
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      editingCharacterId:
                        current.editingCharacterId === character.id
                          ? null
                          : character.id,
                    }))
                  }
                >
                  Edit
                </button>
              </div>

              {isEditing ? (
                <div className="mx-1.5 -mt-0.5 rounded-b-xl border border-t-0 border-dashed border-[#e3c3ba] bg-white p-[11px]">
                  <label className="sr-only" htmlFor={`${idPrefix}-${character.id}-name`}>
                    Character name
                  </label>
                  <input
                    id={`${idPrefix}-${character.id}-name`}
                    className={cn(standardInput, "mb-2.5")}
                    value={character.name}
                    onChange={(event) =>
                      updateCharacter(character.id, { name: event.target.value })
                    }
                    placeholder="Character name"
                  />

                  <fieldset className="m-0 border-0 p-0">
                    <legend className={miniLabel}>Color</legend>
                    <div className="mb-[11px] flex flex-wrap gap-[9px]">
                      {palette.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={cn("size-[26px] shrink-0 cursor-pointer rounded-full border-2 border-white p-0 shadow-[0_0_0_1px_#e2ded6] aria-pressed:border-[3px] aria-pressed:border-[#2b1520]", focusRing)}
                          style={{ backgroundColor: color }}
                          aria-label={`Use color ${color}`}
                          aria-pressed={character.color === color}
                          onClick={() => updateCharacter(character.id, { color })}
                        />
                      ))}
                    </div>
                  </fieldset>

                  <p className={miniLabel}>Profile photo</p>
                  <div className="mb-3 flex items-center gap-2">
                    <label className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-[#ead2c9] bg-[#fbf4f0] px-[11px] py-[7px] text-[12.5px] font-semibold text-[#6e4a54] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#d44d5c]")} htmlFor={photoInputId}>
                      <UploadIcon /> Upload
                      <input
                        id={photoInputId}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => uploadPhoto(character.id, event)}
                      />
                    </label>
                    {character.avatar ? (
                      <button
                        type="button"
                        className={cn("cursor-pointer rounded-[9px] border-0 bg-[#f3e2db] px-[11px] py-[7px] text-[12.5px] font-semibold text-[#8a857c]", focusRing)}
                        onClick={() => updateCharacter(character.id, { avatar: undefined })}
                      >
                        Remove photo
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={cn("cursor-pointer rounded-[9px] border-0 bg-[#fff0f0] px-3 py-2 text-[12.5px] font-bold text-[#e0455e] disabled:cursor-not-allowed disabled:opacity-45", focusRing)}
                    disabled={state.characters.length <= 1}
                    onClick={() => deleteCharacter(character.id)}
                  >
                    Delete character
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <button type="button" className={cn("mt-0.5 w-full cursor-pointer rounded-[11px] border border-dashed border-[#d9a79c] bg-[#fbf4f0] p-[9px] text-[13px] font-bold text-[#d44d5c]", focusRing)} onClick={addCharacter}>
        + Add character
      </button>
    </Panel>
  );
}

function SenderSection() {
  const { state, setState } = useStudio();

  return (
    <Panel title="Sending as">
      <SegmentedControl
        label="Sending as"
        value={state.activeSenderId}
        options={state.characters.map(({ id, name, color }) => ({
          value: id,
          label: name,
          color,
        }))}
        onChange={(activeSenderId) =>
          setState((current) => ({ ...current, activeSenderId }))
        }
      />
      <p className="mt-3.5 mb-[9px] text-[10.5px] font-extrabold tracking-[0.09em] text-[#ad8791] uppercase">Whose phone · blue side</p>
      <SegmentedControl
        label="Whose phone"
        value={state.ownerId}
        options={state.characters.map(({ id, name }) => ({ value: id, label: name }))}
        onChange={(ownerId) => setState((current) => ({ ...current, ownerId }))}
      />
    </Panel>
  );
}

function ScreenSettings() {
  const { state, setState } = useStudio();

  const setField = <Key extends keyof typeof state>(key: Key, value: (typeof state)[Key]) =>
    setState((current) => ({ ...current, [key]: value }));

  return (
    <Panel title="Screen">
      <SettingRow label="Appearance">
        <SegmentedControl
          label="Appearance"
          value={state.dark ? "dark" : "light"}
          options={[
            { value: "light", label: "☀ Light" },
            { value: "dark", label: "☾ Dark" },
          ]}
          onChange={(value) => setField("dark", value === "dark")}
        />
      </SettingRow>
      <SettingRow label="Bubble">
        <SegmentedControl
          label="Bubble color"
          value={state.bubbleColor}
          options={[
            { value: "blue", label: "Blue" },
            { value: "green", label: "Green" },
          ]}
          onChange={(value) => setField("bubbleColor", value as BubbleColor)}
        />
      </SettingRow>

      <div className="mb-3.5 grid grid-cols-2 gap-[11px]">
        <LabeledInput label="Inbox Number">
          <input
            className={standardInput}
            aria-label="Inbox Number"
            inputMode="numeric"
            value={state.inbox}
            onChange={(event) => {
              const value = event.target.value.replace(/\D/g, "");
              setField("inbox", value === "" ? "" : Number(value));
            }}
          />
        </LabeledInput>
        <LabeledInput label="Day">
          <input
            className={standardInput}
            aria-label="Day"
            value={state.day}
            placeholder="Today"
            onChange={(event) => setField("day", event.target.value)}
          />
        </LabeledInput>
        <LabeledInput label="Time">
          <input
            className={standardInput}
            aria-label="Time"
            value={state.time}
            placeholder="9:41"
            onChange={(event) => setField("time", event.target.value)}
          />
        </LabeledInput>
        <LabeledInput label="AM / PM">
          <SegmentedControl
            label="AM or PM"
            value={state.meridiem}
            options={[
              { value: "AM", label: "AM" },
              { value: "PM", label: "PM" },
            ]}
            onChange={(value) => setField("meridiem", value as Meridiem)}
          />
        </LabeledInput>
      </div>

      <p className={miniLabel}>Delivery status</p>
      <SegmentedControl
        label="Delivery status"
        value={state.status}
        options={(["Delivered", "Read", "None"] as DeliveryStatus[]).map((value) => ({
          value,
          label: value,
        }))}
        onChange={(value) => setField("status", value as DeliveryStatus)}
      />

      <div className="mt-[11px]">
        <label className={cn(miniLabel, "mb-[5px]")} htmlFor="read-time">
          Read time <span className="font-semibold text-[#c69aa0] normal-case">· shown after “Read”</span>
        </label>
        <input
          id="read-time"
          className={standardInput}
          value={state.readTime}
          placeholder="10:01 PM"
          onChange={(event) => setField("readTime", event.target.value)}
        />
      </div>
    </Panel>
  );
}

export function Avatar({ character, size }: { character: Character; size: "small" | "large" }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-cover bg-center font-bold text-white",
        size === "large" ? "size-[50px] text-[21px]" : "size-[38px] text-[15px]",
      )}
      style={{
        backgroundColor: character.color,
        backgroundImage: character.avatar
          ? `url(${character.avatar})`
          : "linear-gradient(160deg, rgba(255,255,255,.42), rgba(255,255,255,0))",
      }}
      aria-hidden="true"
    >
      {character.avatar ? null : initials(character.name)}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-[13px] rounded-2xl border border-black/6 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] last:mb-0">
      <h2 className="mb-2.5 text-[10.5px] font-extrabold tracking-[0.09em] text-[#ad8791] uppercase">{title}</h2>
      {children}
    </section>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex items-center justify-between gap-3">
      <span className="text-[13px] font-semibold text-[#6e4a54]">{label}</span>
      <div className="w-[210px]">{children}</div>
    </div>
  );
}

function LabeledInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={cn(miniLabel, "mb-[5px]")}>{label}</span>
      {children}
    </div>
  );
}

type SegmentOption = { value: string; label: string; color?: string };

function SegmentedControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SegmentOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-[#f0ddd5] p-1" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={cn("flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[9px] border-0 bg-transparent px-1 py-[7px] text-[12.5px] font-semibold whitespace-nowrap text-[#8c6c74]", option.value === value && "bg-white text-[#d44d5c] shadow-[0_1px_2px_rgba(0,0,0,0.13)]", focusRing)}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.color ? (
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: option.color }} />
          ) : null}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
