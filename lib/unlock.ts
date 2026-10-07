import type { ChallengeCard } from "@/content/types";
import type { ProgressState } from "./progress";

/** A challenge opens once the episodes before it are watched (or a parent turned on "Unlock all"). */
export function isChallengeUnlocked(
  challenge: Pick<ChallengeCard, "requires">,
  state: Pick<ProgressState, "episodes" | "settings">,
): boolean {
  if (state.settings.unlockAll) return true;
  return challenge.requires.every((id) => state.episodes[id]?.watched);
}

/** Episodes still to watch before this challenge opens, in order. */
export function missingForChallenge(
  challenge: Pick<ChallengeCard, "requires">,
  state: Pick<ProgressState, "episodes">,
): string[] {
  return challenge.requires.filter((id) => !state.episodes[id]?.watched);
}
