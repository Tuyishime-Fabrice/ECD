import type { ItemCard, SeasonCard } from "@/content/types";
import type { ProgressState, Stars } from "./progress";
import { isChallengeUnlocked, missingForChallenge } from "./unlock";

export type ItemStatus =
  | { type: "episode"; watched: boolean; percent: number }
  | { type: "challenge"; locked: boolean; done: boolean; stars: Stars | 0 };

type State = Pick<ProgressState, "episodes" | "challenges" | "settings">;

export function itemStatus(item: ItemCard, state: State): ItemStatus {
  if (item.type === "episode") {
    const p = state.episodes[item.id];
    return { type: "episode", watched: p?.watched ?? false, percent: p?.percent ?? 0 };
  }
  const result = state.challenges[item.id];
  return {
    type: "challenge",
    locked: !isChallengeUnlocked(item, state),
    done: !!result,
    stars: result?.bestStars ?? 0,
  };
}

const isDone = (item: ItemCard, state: State) =>
  item.type === "episode" ? !!state.episodes[item.id]?.watched : !!state.challenges[item.id];

const publishedItems = (seasons: SeasonCard[]) =>
  seasons.filter((s) => s.status === "published").flatMap((s) => s.items);

/** True once the child has started any episode or finished any challenge. */
export function hasStarted(state: Pick<ProgressState, "episodes" | "challenges">): boolean {
  return Object.keys(state.episodes).length > 0 || Object.keys(state.challenges).length > 0;
}

/**
 * What to do next: the first unwatched episode in order, or a challenge
 * that is open but not played yet. Null when everything is done.
 */
export function nextRecommended(seasons: SeasonCard[], state: State): ItemCard | null {
  for (const item of publishedItems(seasons)) {
    if (isDone(item, state)) continue;
    if (item.type === "challenge" && !isChallengeUnlocked(item, state)) continue;
    return item;
  }
  return null;
}

/**
 * The item after `itemId` for the "Next" button. If that is a challenge
 * that is still locked, suggest the first episode that unlocks it instead.
 */
export function nextAfter(seasons: SeasonCard[], itemId: string, state: State): ItemCard | null {
  const items = publishedItems(seasons);
  const index = items.findIndex((i) => i.id === itemId);
  const next = index >= 0 ? items[index + 1] : undefined;
  if (!next) return null;
  if (next.type === "challenge" && !isChallengeUnlocked(next, state)) {
    const firstMissing = missingForChallenge(next, state)[0];
    return items.find((i) => i.id === firstMissing) ?? null;
  }
  return next;
}
