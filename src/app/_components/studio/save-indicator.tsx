import type { SaveStatus } from "./use-episode-autosave";

const labels: Record<SaveStatus, string> = {
  saved: "Saved",
  saving: "Saving…",
  retrying: "Retrying…",
  conflict: "Changed elsewhere — reload",
};

export function SaveIndicator({ status }: { status: SaveStatus }) {
  return (
    <span
      role="status"
      aria-label="Save status"
      className={status === "conflict" ? "text-red-600" : "text-sand-500"}
    >
      {labels[status]}
    </span>
  );
}
