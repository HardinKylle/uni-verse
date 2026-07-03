"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PanelRight, PanelRightClose } from "lucide-react";

import { EditorSidebar } from "./editor-sidebar";
import { PhonePreview } from "./phone-preview";
import { ScriptPanel } from "./script-panel";
import { PropertiesPanel } from "./properties-panel";
import { StudioContext } from "./studio-context";
import { PANEL_WIDTH } from "./constants";
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
  projectName: "Untitled Episode",
  projectDescription: "A new story...",
  isRightPanelOpen: true,
  showKeyboard: false,
};

export function Studio() {
  const [state, setState] = useState(initialState);
  const contextValue = useMemo(() => ({ state, setState }), [state]);

  return (
    <StudioContext.Provider value={contextValue}>
      <main className="flex h-screen overflow-hidden bg-[#F7F3EF] text-foreground font-sans text-sm p-3 gap-3">
        <div className="flex w-[820px] shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <EditorSidebar />
          <ScriptPanel />
        </div>

        <div className="relative flex flex-1 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <PhonePreview />

          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setState(s => ({ ...s, isRightPanelOpen: !s.isRightPanelOpen }))}
              className="flex size-9 items-center justify-center rounded-lg bg-white/80 backdrop-blur text-sand-500 shadow-sm ring-1 ring-black/5 hover:text-sand-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              aria-label={state.isRightPanelOpen ? "Close properties" : "Open properties"}
            >
              {state.isRightPanelOpen ? <PanelRightClose className="size-4.5" /> : <PanelRight className="size-4.5" />}
            </button>
          </div>
        </div>

        <motion.div
          initial={false}
          animate={{
            width: state.isRightPanelOpen ? PANEL_WIDTH : 0,
            opacity: state.isRightPanelOpen ? 1 : 0
          }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className="flex shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
        >
          <div className="shrink-0 h-full" style={{ width: PANEL_WIDTH }}>
            <PropertiesPanel />
          </div>
        </motion.div>
      </main>
    </StudioContext.Provider>
  );
}
