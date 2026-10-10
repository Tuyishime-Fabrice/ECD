/**
 * Is the latest save live yet? The build writes /build-info.json with the commit
 * it was built from. A save is live once the app was built from that commit or a
 * newer one (docs/ADMIN.md, "Going live").
 */

export type LiveState = "live" | "going" | "slow" | "unknown";

/** After this long without going live, say it's taking longer than usual. */
export const SLOW_AFTER_MS = 10 * 60_000;

export type LiveInput = {
  /** The commit the running app was built from; null when /build-info.json is missing (`next dev`). */
  deployed: string | null;
  /** The save to wait for; the newest in History when there is no save from this browser. */
  target: string | null;
  /** Shas from History, newest first. */
  history: readonly string[];
  /** What /build-info.json said when the save was made, if it was made here. */
  deployedAtSave?: string | null;
  /** When the save was made (ms), if it was made here. */
  savedAt?: number;
  /**
   * Commits the save made before `target`, its last one: pictures that didn't fit in one
   * save go first. An app built from one of them doesn't have the save's stories yet.
   */
  earlier?: readonly string[];
  now?: number;
};

export function liveState({
  deployed,
  target,
  history,
  deployedAtSave,
  savedAt,
  earlier = [],
  now = Date.now(),
}: LiveInput): LiveState {
  if (!deployed || deployed === "dev") return "unknown";
  if (!target || deployed === target) return "live";
  const deployedAt = history.indexOf(deployed);
  const targetAt = history.indexOf(target);
  let live: boolean;
  if (earlier.includes(deployed)) {
    live = false;
  } else if (deployedAt !== -1) {
    // Both in History, which is newest first: a smaller index is a newer save.
    live = targetAt !== -1 && deployedAt < targetAt;
  } else if (savedAt !== undefined) {
    // The app was built from a commit that isn't a save (a code change). If that build
    // finished after this save was made, it was started after it too and includes it.
    live = deployedAtSave !== undefined && deployed !== deployedAtSave;
  } else {
    // Nothing saved from here: a code change newer than the last save is the usual reason.
    live = true;
  }
  if (live) return "live";
  return savedAt !== undefined && now - savedAt > SLOW_AFTER_MS ? "slow" : "going";
}
