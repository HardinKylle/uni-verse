"use client";

import { useStudio } from "../studio-context";
import {
  Panel,
  SegmentedControl,
  CustomSelect,
  SettingRow,
  LabeledInput,
  standardInput,
  miniLabel,
} from "../ui/shared-ui";
import type { BubbleColor, DeliveryStatus, Meridiem } from "../types";

export function PropertiesPanel() {
  return (
    <aside className="h-full w-[21.25rem] shrink-0 overflow-y-auto border-l border-sand-100 bg-white px-5 pt-5 pb-12 [scrollbar-color:#e8ded7_transparent] [scrollbar-width:thin]">
      <SenderSection />
      <ScreenSettings />
    </aside>
  );
}

function SenderSection() {
  const { state, setState } = useStudio();

  const setField = <Key extends keyof typeof state>(key: Key, value: (typeof state)[Key]) =>
    setState((current) => ({ ...current, [key]: value }));

  return (
    <Panel title="Roles" className="relative z-30">
      <div className="mb-4 relative z-20">
        <CustomSelect
          label="Sending as"
          value={state.activeSenderId}
          options={state.characters.map((char) => ({ value: char.id, label: char.name, color: char.color }))}
          onChange={(activeSenderId) => setField("activeSenderId", activeSenderId)}
        />
      </div>
      <div className="relative z-10">
        <CustomSelect
          label="Whose phone (Blue side)"
          value={state.ownerId}
          options={state.characters.map((char) => ({ value: char.id, label: char.name, color: char.color }))}
          onChange={(ownerId) => setField("ownerId", ownerId)}
        />
      </div>
    </Panel>
  );
}

function ScreenSettings() {
  const { state, setState } = useStudio();

  const setField = <Key extends keyof typeof state>(key: Key, value: (typeof state)[Key]) =>
    setState((current) => ({ ...current, [key]: value }));

  return (
    <Panel title="Screen Settings">
      <SettingRow label="Appearance">
        <SegmentedControl
          label="Appearance"
          value={state.dark ? "dark" : "light"}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          onChange={(value) => setField("dark", value === "dark")}
        />
      </SettingRow>
      <SettingRow label="Bubble Style">
        <SegmentedControl<BubbleColor>
          label="Bubble color"
          value={state.bubbleColor}
          options={[
            { value: "blue", label: "Blue" },
            { value: "green", label: "Green" },
          ]}
          onChange={(value) => setField("bubbleColor", value)}
        />
      </SettingRow>

      <SettingRow label="Keyboard">
        <SegmentedControl
          label="Keyboard"
          value={state.showKeyboard ? "show" : "hide"}
          options={[
            { value: "show", label: "Show" },
            { value: "hide", label: "Hide" },
          ]}
          onChange={(value) => setField("showKeyboard", value === "show")}
        />
      </SettingRow>

      <div className="my-5 grid grid-cols-2 gap-3">
        <LabeledInput label="Inbox Badge">
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
        <LabeledInput label="Meridiem">
          <SegmentedControl<Meridiem>
            label="AM or PM"
            value={state.meridiem}
            options={[
              { value: "AM", label: "AM" },
              { value: "PM", label: "PM" },
            ]}
            onChange={(value) => setField("meridiem", value)}
          />
        </LabeledInput>
      </div>

      <div className="mb-4">
        <p className={miniLabel}>Delivery Status</p>
        <SegmentedControl<DeliveryStatus>
          label="Delivery status"
          value={state.status}
          options={(["Delivered", "Read", "None"] as const).map((value) => ({
            value,
            label: value,
          }))}
          onChange={(value) => setField("status", value)}
        />
      </div>

      <LabeledInput label="Read Time (shown after 'Read')">
        <input
          id="read-time"
          aria-label="Read time"
          className={standardInput}
          value={state.readTime}
          placeholder="10:01 PM"
          onChange={(event) => setField("readTime", event.target.value)}
        />
      </LabeledInput>
    </Panel>
  );
}
