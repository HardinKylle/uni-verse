"use client";

import { useMemo, useState } from "react";

import { EditorSidebar } from "./editor-sidebar";
import { PhonePreview } from "./phone-preview";
import { ScriptPanel } from "./script-panel";
import { StudioContext } from "./studio-context";
import type { StudioState } from "./types";

const initialState: StudioState = {
  dark: false,
  characters: [
    { id: "c1", name: "Jaz", color: "#ff7a7a" },
    { id: "c2", name: "Kylle", color: "#5aa9e6" },
  ],
  ownerId: "c2",
  activeSenderId: "c1",
  messages: [
    { id: "m1", senderId: "c1", text: "why r u dumb" },
    { id: "m2", senderId: "c2", text: "i dont know" },
  ],
  editingCharacterId: null,
  status: "Delivered",
  day: "Today",
  time: "9:41",
  meridiem: "AM",
  inbox: 12,
  readTime: "10:01 PM",
  bubbleColor: "blue",
  draft: "",
};

export function Studio() {
  const [state, setState] = useState(initialState);
  const contextValue = useMemo(() => ({ state, setState }), [state]);

  return (
    <StudioContext.Provider value={contextValue}>
      <main className="flex h-screen min-w-[1180px] overflow-hidden bg-[#e7d6ce] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Segoe_UI',sans-serif] text-[#2b1520]">
        <EditorSidebar />
        <ScriptPanel />
        <PhonePreview />
      </main>
    </StudioContext.Provider>
  );
}
