import { Label, ListBox, ListBoxItem, Select } from "@heroui/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

import { focusRing, miniLabel, standardInput } from "@/components/ui/form-styles";
import type { Character } from "../types";

/** iOS-style outline focus ring, used inside the phone preview instead of the ring/offset style above. */
export const focusRingOutline = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500";

export { focusRing, miniLabel, standardInput };

export const panelTitle = "font-mono text-[10.5px] font-medium tracking-[0.05em] text-sand-800 uppercase";

export function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("mb-8", className)}>
      <h2 className={cn(panelTitle, "mb-3.5")}>{title}</h2>
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
  isDisabled = false,
}: {
  label: string;
  value: string;
  options: SegmentOption<string>[];
  onChange: (value: string) => void;
  isDisabled?: boolean;
}) {
  return (
    <Select
      selectedKey={value}
      onSelectionChange={(key) => onChange(String(key))}
      isDisabled={isDisabled}
      fullWidth
    >
      <Label className={miniLabel}>{label}</Label>
      <Select.Trigger>
        <Select.Value>
          {({ selectedItem }) => {
            const option = (selectedItem as SegmentOption<string> | null) ?? options[0];
            return (
              <span className="flex items-center gap-2 text-sand-900">
                {option?.color ? (
                  <span
                    className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: option.color }}
                  />
                ) : null}
                {option?.label}
              </span>
            );
          }}
        </Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox aria-label={label} items={options}>
          {(option: SegmentOption<string>) => (
            <ListBoxItem id={option.value} key={option.value} textValue={option.label} className="text-sand-900">
              {option.color ? (
                <span
                  className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: option.color }}
                />
              ) : null}
              {option.label}
            </ListBoxItem>
          )}
        </ListBox>
      </Select.Popover>
    </Select>
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
