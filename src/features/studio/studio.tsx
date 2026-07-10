"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { LogOut, PanelRight, PanelRightClose } from "lucide-react";

import { EditorSidebar } from "./editor/editor-sidebar";
import { ExportButton } from "./export/export-panel";
import { PhonePreview } from "./phone/phone-preview";
import { ScriptPanel } from "./editor/script-panel";
import { PropertiesPanel } from "./editor/properties-panel";
import { StudioContext } from "./studio-context";
import { PANEL_WIDTH } from "./constants";
import { demoState } from "./demo-state";
import { SaveIndicator } from "./ui/save-indicator";
import { useEpisodeAutosave } from "./persistence/use-episode-autosave";
import type { StudioInitialData } from "./types";

export function Studio({
  authenticatedUser,
  initialData,
}: {
  authenticatedUser?: string;
  initialData?: StudioInitialData;
}) {
  const [state, setState] = useState(initialData?.state ?? demoState);
  const saveStatus = useEpisodeAutosave(state, initialData?.episode);
  const isAuthenticated = Boolean(authenticatedUser);
  const contextValue = useMemo(() => ({ state, setState, isAuthenticated }), [state, isAuthenticated]);
  // Every studio action replaces these arrays, so identity against the seed
  // distinguishes real content edits from panel toggles and screen settings.
  const hasDemoEdits = state.messages !== demoState.messages || state.characters !== demoState.characters;

  return (
    <StudioContext.Provider value={contextValue}>
      <main className="flex h-screen min-w-[1600px] flex-col overflow-hidden bg-[#F7F3EF] text-foreground font-sans text-sm p-3 gap-2">
        <header className="relative z-40 flex shrink-0 items-center justify-between rounded-2xl border border-sand-200/70 bg-white py-3 pl-4 pr-2">
          <Link href="/" className="font-display text-xl leading-none text-sand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-sm">
            Kathalis<span className="text-accent-500">.</span>
          </Link>
          <div className="flex items-center gap-2">
            {authenticatedUser ? (
              <>
                <div className="flex items-center gap-2 text-xs text-sand-600">
                  {initialData ? <SaveIndicator status={saveStatus} /> : null}
                  <span className="max-w-48 truncate">Signed in as {authenticatedUser}</span>
                </div>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-sand-200 px-3 text-[12.5px] font-medium text-sand-500 transition-colors hover:bg-sand-50 hover:text-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  >
                    <LogOut className="size-3.5" />
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <div className="relative">
                <a
                  href="/login"
                  className="flex h-9 items-center rounded-lg bg-sand-900 px-3 text-[12.5px] font-semibold text-white shadow-sm transition-colors hover:bg-sand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
                >
                  Sign in
                </a>
                {hasDemoEdits ? (
                  <p className="absolute top-[calc(100%+4px)] right-0 z-20 whitespace-nowrap rounded-md bg-white/80 px-2 py-0.5 text-[11px] text-sand-500 shadow-sm ring-1 ring-black/5 backdrop-blur">
                    Demo edits won&apos;t be carried over
                  </p>
                ) : null}
              </div>
            )}
            <div aria-hidden className="mx-1 h-5 w-px bg-sand-200" />
            <ExportButton />
            <button
              onClick={() => setState(s => ({ ...s, isRightPanelOpen: !s.isRightPanelOpen }))}
              className="flex size-9 items-center justify-center rounded-lg border border-sand-200 text-sand-500 transition-colors hover:bg-sand-50 hover:text-sand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              aria-label={state.isRightPanelOpen ? "Close properties" : "Open properties"}
            >
              {state.isRightPanelOpen ? <PanelRightClose className="size-4.5" /> : <PanelRight className="size-4.5" />}
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 gap-3">
          <div className="flex w-[820px] shrink-0 overflow-hidden rounded-2xl border border-sand-200/70 bg-white">
            <EditorSidebar />
            <ScriptPanel />
          </div>

          <div className="relative flex flex-1 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5">
            <PhonePreview />
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
        </div>
      </main>
    </StudioContext.Provider>
  );
}
