"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LogOut, PanelRight, PanelRightClose } from "lucide-react";

import { EditorSidebar } from "./editor-sidebar";
import { ExportButton } from "./export-panel";
import { PhonePreview } from "./phone-preview";
import { ScriptPanel } from "./script-panel";
import { PropertiesPanel } from "./properties-panel";
import { StudioContext } from "./studio-context";
import { PANEL_WIDTH } from "./constants";
import { demoState } from "./demo-state";
import { SaveIndicator } from "./save-indicator";
import { useEpisodeAutosave } from "./use-episode-autosave";
import type { StudioState } from "./types";

export type StudioInitialData = {
  state: StudioState;
  episode: { id: string; updatedAt: string };
};

export function Studio({
  authenticatedUser,
  initialData,
}: {
  authenticatedUser?: string;
  initialData?: StudioInitialData;
}) {
  const [state, setState] = useState(initialData?.state ?? demoState);
  const saveStatus = useEpisodeAutosave(state, initialData?.episode);
  const contextValue = useMemo(() => ({ state, setState }), [state]);

  return (
    <StudioContext.Provider value={contextValue}>
      <main className="flex h-screen min-w-[1600px] overflow-hidden bg-[#F7F3EF] text-foreground font-sans text-sm p-3 gap-3">
        <div className="flex w-[820px] shrink-0 overflow-hidden rounded-2xl border border-sand-200/70 bg-white">
          <EditorSidebar />
          <ScriptPanel />
        </div>

        <div className="relative flex flex-1 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5">
          <PhonePreview />

          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            {authenticatedUser ? (
              <div className="flex h-9 items-center gap-2 rounded-lg bg-white/80 px-3 text-xs text-sand-600 shadow-sm ring-1 ring-black/5 backdrop-blur">
                {initialData ? <SaveIndicator status={saveStatus} /> : null}
                <span className="max-w-48 truncate">Signed in as {authenticatedUser}</span>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="flex items-center gap-1 text-sand-500 transition-colors hover:text-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  >
                    <LogOut className="size-3.5" />
                    Sign out
                  </button>
                </form>
              </div>
            ) : null}
            <ExportButton />
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
          className="flex shrink-0 overflow-hidden rounded-2xl border border-sand-200/70 bg-white"
        >
          <div className="shrink-0 h-full" style={{ width: PANEL_WIDTH }}>
            <PropertiesPanel />
          </div>
        </motion.div>
      </main>
    </StudioContext.Provider>
  );
}
