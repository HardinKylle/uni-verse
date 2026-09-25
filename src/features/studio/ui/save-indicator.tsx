"use client";

import { RotateCw } from "lucide-react";

import type { SaveStatus } from "../persistence/use-episode-autosave";

const labels: Record<SaveStatus, string> = {
  saved: "Saved",
  saving: "Saving…",
  retrying: "Retrying…",
  conflict: "Changed elsewhere",
};

export function SaveIndicator({ status }: { status: SaveStatus }) {
  // The conflict state is a dead end for the writer unless they reload, so it
  // gets a prominent badge plus a real Reload action rather than a passive line
  // of red text. The Reload button sits outside the role="status" element so the
  // status keeps its exact accessible text.
  if (status === "conflict") {
    return (
      <span className="inline-flex items-center gap-2">
        <span
          role="status"
          aria-label="Save status"
          className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-[0.75rem] font-semibold text-red-700 ring-1 ring-red-200"
        >
          <RotateCw className="size-3.5" aria-hidden />
          {labels.conflict}
        </span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md bg-red-600 px-2.5 py-1 text-[0.75rem] font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
        >
          Reload
        </button>
      </span>
    );
  }

  return (
    <span role="status" aria-label="Save status" className="text-sand-500">
      {labels[status]}
    </span>
  );
}
