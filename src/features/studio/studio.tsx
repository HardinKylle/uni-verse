"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, LayoutDashboard, PanelRight, PanelRightClose } from "lucide-react";

import { EditorSidebar } from "./editor/editor-sidebar";
import { Button } from "@heroui/react";

import { SignOutButton } from "@/features/account/sign-out-button";
import { BrandLogo } from "@/components/brand-logo";
import { ExportButton } from "./export/export-panel";
import { PhonePreview } from "./phone/phone-preview";
import { ScriptPanel } from "./editor/script-panel";
import { PropertiesPanel } from "./editor/properties-panel";
import { StudioContext } from "./studio-context";
import { PANEL_WIDTH } from "./constants";
import { demoState } from "./demo-state";
import { SaveIndicator } from "./ui/save-indicator";
import { SmallScreenNotice } from "./ui/small-screen-notice";
import { useEpisodeAutosave, type SaveStatus } from "./persistence/use-episode-autosave";
import { useCharacterAutosave } from "./persistence/use-character-autosave";
import { useCharacterDeletion } from "./persistence/use-character-deletion";
import { useEpisodeNavigation } from "./persistence/use-episode-navigation";
import type { StudioInitialData } from "./types";

const STATUS_PRIORITY: SaveStatus[] = ["conflict", "retrying", "saving", "saved"];

/** Combines the three independently-diffed autosave slices into one indicator, worst status wins. */
function combineSaveStatus(...statuses: SaveStatus[]): SaveStatus {
  return STATUS_PRIORITY.find((status) => statuses.includes(status)) ?? "saved";
}

/** Where the properties panel docks as a column; below this it opens as an overlay drawer. */
const DOCKED_PANEL_QUERY = "(min-width: 80rem)";

function subscribeToDockedPanel(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(DOCKED_PANEL_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Server render assumes the docked layout; below `xl` the docked column is CSS-hidden anyway. */
function useIsPanelDocked() {
  return useSyncExternalStore(
    subscribeToDockedPanel,
    () => typeof window.matchMedia !== "function" || window.matchMedia(DOCKED_PANEL_QUERY).matches,
    () => true,
  );
}

export function Studio({
  authenticatedUser,
  initialData,
}: {
  authenticatedUser?: string;
  initialData?: StudioInitialData;
}) {
  const [state, setState] = useState(initialData?.state ?? demoState);
  const isPanelDocked = useIsPanelDocked();
  // Kept apart from `isRightPanelOpen` so opening the drawer on a small screen
  // doesn't change the docked panel's saved state on a large one.
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isPanelOpen = isPanelDocked ? state.isRightPanelOpen : isDrawerOpen;
  const showDrawer = !isPanelDocked && isDrawerOpen;

  useEffect(() => {
    if (!showDrawer) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) setIsDrawerOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showDrawer]);
  const episodeAutosave = useEpisodeAutosave(state, initialData?.episode);
  const characterAutosave = useCharacterAutosave(state, initialData?.projectId);
  const characterDeletion = useCharacterDeletion({
    state,
    setState,
    initialData,
    episodeAutosave,
    characterAutosave,
  });
  const episodeNavigation = useEpisodeNavigation(
    state,
    initialData,
    episodeAutosave,
    characterAutosave,
  );
  const saveStatus = combineSaveStatus(episodeAutosave.status, characterAutosave.status);
  const isAuthenticated = Boolean(authenticatedUser);
  const contextValue = useMemo(
    () => ({ state, setState, isAuthenticated, userId: initialData?.userId }),
    [state, isAuthenticated, initialData?.userId],
  );
  // Every studio action replaces these arrays, so identity against the seed
  // distinguishes real content edits from panel toggles and screen settings.
  const hasDemoEdits = state.messages !== demoState.messages || state.characters !== demoState.characters;

  return (
    <StudioContext.Provider value={contextValue}>
      <SmallScreenNotice />
      <main data-studio className="hidden h-screen flex-col overflow-hidden bg-[#F7F3EF] text-foreground font-sans text-sm p-3 gap-2 lg:flex">
        <header className="relative z-40 flex shrink-0 items-center justify-between rounded-2xl border border-sand-200/70 bg-white py-3 pl-4 pr-2">
          <nav aria-label="Studio" className="flex min-w-0 items-center gap-2.5">
            <Link href="/" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500">
              <BrandLogo />
            </Link>
            {initialData ? (
              <>
                <div aria-hidden className="h-5 w-px bg-sand-200" />
                <Link
                  href="/dashboard"
                  className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-sand-500 transition-colors hover:bg-sand-50 hover:text-sand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                >
                  <LayoutDashboard className="size-3.5" aria-hidden />
                  Dashboard
                </Link>
                <ChevronRight className="size-3.5 shrink-0 text-sand-300" aria-hidden />
                <span className="max-w-72 truncate font-display text-lg text-sand-800" title={initialData.projectTitle}>
                  {initialData.projectTitle}
                </span>
              </>
            ) : null}
          </nav>
          <div className="flex items-center gap-2">
            {authenticatedUser ? (
              <>
                <div className="flex items-center gap-2 text-xs text-sand-600">
                  {initialData ? <SaveIndicator status={saveStatus} /> : null}
                  <span className="max-w-48 truncate">Signed in as {authenticatedUser}</span>
                </div>
                <SignOutButton />
              </>
            ) : (
              <div className="relative">
                <a
                  href="/login"
                  className="flex h-9 items-center rounded-lg bg-sand-900 px-3 text-[0.7812rem] font-semibold text-white shadow-sm transition-colors hover:bg-sand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
                >
                  Sign in
                </a>
                {hasDemoEdits ? (
                  <p className="absolute top-[calc(100%+4px)] right-0 z-20 whitespace-nowrap rounded-md bg-white/80 px-2 py-0.5 text-[0.6875rem] text-sand-500 shadow-sm ring-1 ring-black/5 backdrop-blur">
                    Demo edits won&apos;t be carried over
                  </p>
                ) : null}
              </div>
            )}
            <div aria-hidden className="mx-1 h-5 w-px bg-sand-200" />
            <ExportButton />
            <Button
              variant="outline"
              size="sm"
              isIconOnly
              aria-label={isPanelOpen ? "Close properties" : "Open properties"}
              aria-expanded={isPanelOpen}
              onPress={() => {
                if (isPanelDocked) setState(s => ({ ...s, isRightPanelOpen: !s.isRightPanelOpen }));
                else setIsDrawerOpen(open => !open);
              }}
            >
              {isPanelOpen ? <PanelRightClose className="size-4.5" /> : <PanelRight className="size-4.5" />}
            </Button>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 gap-3">
          <div className="flex min-w-0 flex-[1.25] overflow-hidden rounded-2xl border border-sand-200/70 bg-white">
            <EditorSidebar
              characterDeletion={characterDeletion}
              episode={initialData ? {
                activeId: initialData.episode.id,
                episodes: initialData.episodes,
                ...episodeNavigation,
              } : undefined}
            />
            <ScriptPanel />
          </div>

          <div className="relative flex flex-1 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5">
            <PhonePreview />
          </div>

          <motion.div
            initial={false}
            animate={{
              width: state.isRightPanelOpen ? PANEL_WIDTH : "0rem",
              opacity: state.isRightPanelOpen ? 1 : 0
            }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="hidden shrink-0 overflow-hidden rounded-2xl border border-sand-200/70 bg-white xl:flex"
          >
            <div className="shrink-0 h-full" style={{ width: PANEL_WIDTH }}>
              <PropertiesPanel />
            </div>
          </motion.div>

          <AnimatePresence>
            {showDrawer ? (
              <>
                <motion.div
                  key="properties-backdrop"
                  aria-hidden
                  className="absolute inset-0 z-30 rounded-2xl bg-sand-900/15"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsDrawerOpen(false)}
                />
                <motion.div
                  key="properties-drawer"
                  role="dialog"
                  aria-label="Properties"
                  className="absolute inset-y-0 right-0 z-40 max-w-full overflow-hidden rounded-2xl border border-sand-200/70 bg-white shadow-2xl"
                  style={{ width: PANEL_WIDTH }}
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                >
                  <PropertiesPanel />
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>
        </div>
      </main>
    </StudioContext.Provider>
  );
}
