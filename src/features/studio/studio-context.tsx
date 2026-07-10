"use client";

import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
} from "react";

import type { StudioState } from "./types";

type StudioContextValue = {
  state: StudioState;
  setState: Dispatch<SetStateAction<StudioState>>;
  isAuthenticated: boolean;
};

export const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio() {
  const context = useContext(StudioContext);

  if (!context) {
    throw new Error("useStudio must be used inside StudioContext.Provider");
  }

  return context;
}
