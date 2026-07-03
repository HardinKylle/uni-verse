import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useId, useState, useRef, useEffect } from "react";

import type { Character } from "./types";

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-1 focus-visible:border-transparent";

/** iOS-style outline focus ring, used inside the phone preview instead of the ring/offset style above. */
export const focusRingOutline = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500";

export const standardInput = cn(
  "w-full rounded-md border border-transparent bg-transparent px-2.5 py-1.5 text-[13px] text-sand-900 placeholder:text-sand-400 transition-colors hover:bg-sand-100/80 focus:bg-white focus:ring-1 focus:ring-sand-200 focus:shadow-sm focus:outline-none",
);

export const miniLabel = "mb-2 block text-[10px] font-semibold tracking-[0.06em] text-sand-500 uppercase";

export function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("mb-8", className)}>
      <h2 className="mb-3.5 text-[11px] font-bold tracking-[0.08em] text-sand-800 uppercase">{title}</h2>
      {children}
    </section>
  );
}

export function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <span className="text-[12.5px] font-medium text-sand-700">{label}</span>
      <div className="w-[180px]">{children}</div>
    </div>
  );
}

export function LabeledInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={cn(miniLabel, "mb-[5px]")}>{label}</span>
      {children}
    </div>
  );
}

export type SegmentOption<T extends string> = { value: T; label: string; color?: string };

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn("flex gap-1 rounded-[10px] bg-sand-100 p-1", disabled && "opacity-50")} role="group" aria-label={label}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            type="button"
            key={option.value}
            disabled={disabled}
            className={cn("relative flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border-0 bg-transparent px-1 py-1.5 text-[12px] font-medium whitespace-nowrap transition-colors z-10 disabled:cursor-not-allowed", isActive ? "text-accent-800" : "text-sand-500 hover:text-sand-800", focusRing)}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
          >
            {isActive && (
              <motion.div
                layoutId={`segment-${label}`}
                className="absolute inset-0 -z-10 rounded-md bg-white shadow-sm ring-1 ring-black/5"
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            )}
            {option.color ? (
              <span className="size-2 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: option.color }} />
            ) : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function CustomSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SegmentOption<string>[];
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value) || options[0];
  const selectedIndex = Math.max(options.findIndex((option) => option.value === value), 0);

  function openAt(index: number) {
    setActiveIndex(index);
    setIsOpen(true);
  }

  function selectOption(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        role="combobox"
        className={cn(standardInput, "flex items-center justify-between cursor-pointer focus:ring-accent-500 focus:border-transparent")}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!isOpen) {
              openAt(selectedIndex);
              return;
            }
            const direction = event.key === "ArrowDown" ? 1 : -1;
            setActiveIndex((index) => (index + direction + options.length) % options.length);
          } else if (isOpen && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            selectOption(activeIndex);
          } else if (isOpen && event.key === "Escape") {
            event.preventDefault();
            setIsOpen(false);
          }
        }}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={isOpen ? `${listId}-option-${activeIndex}` : undefined}
      >
        <span className="flex items-center gap-2">
          {selectedOption?.color ? (
            <span className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: selectedOption.color }} />
          ) : null}
          {selectedOption?.label}
        </span>
        <ChevronDown className="size-4 text-sand-400" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-[calc(100%+4px)] left-0 w-full rounded-xl border border-sand-200 bg-white/95 backdrop-blur-xl shadow-xl ring-1 ring-black/5 overflow-hidden z-50"
          >
            <ul id={listId} role="listbox" aria-label={label} className="max-h-48 overflow-y-auto p-1 m-0 list-none flex flex-col gap-0.5">
              {options.map((option, index) => (
                <li
                  id={`${listId}-option-${index}`}
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-[13px] font-medium transition-colors",
                    index === activeIndex ? "bg-accent-100/50 text-accent-900" : "hover:bg-sand-50 text-sand-700"
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    selectOption(index);
                  }}
                >
                  {option.color ? (
                    <span className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: option.color }} />
                  ) : null}
                  {option.label}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const initials = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

export function Avatar({ character, size }: { character: Character; size: "small" | "large" }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-cover bg-center font-bold text-white shadow-sm ring-1 ring-black/10",
        size === "large" ? "size-12 text-lg" : "size-9 text-[13px]",
      )}
      style={{
        backgroundColor: character.color,
        backgroundImage: character.avatar
          ? `url(${character.avatar})`
          : "linear-gradient(160deg, rgba(255,255,255,.3), rgba(255,255,255,0))",
      }}
      aria-hidden="true"
    >
      {character.avatar ? null : initials(character.name)}
    </div>
  );
}
