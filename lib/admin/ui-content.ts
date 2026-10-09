/**
 * The dashboard's changes to content/seasons.json and content/site.json, as pure
 * functions: each returns a new copy and leaves its input alone. In the code a
 * collection is a `season` and a story an `episode`.
 */
import type { Challenge, Content, Episode, LocalizedText, Question, Season, SeasonColor } from "@/content/schema";
import type { Site } from "@/content/site";
import { MAX_FEATURED } from "@/content/site";
import { slugify } from "./uploads";

export type Item = Season["items"][number];
export type Direction = -1 | 1;

const clone = <T>(value: T): T => structuredClone(value);
const text = (en = "", rw = ""): LocalizedText => ({ en, rw });

/* ---------- Finding things ---------- */

export type Found<T> = { season: Season; seasonIndex: number; itemIndex: number; value: T };

export function findStory(content: Content, id: string): Found<Episode> | null {
  for (const [seasonIndex, season] of content.seasons.entries()) {
    const itemIndex = season.items.findIndex((i) => i.type === "episode" && i.episode.id === id);
    const item = season.items[itemIndex];
    if (item?.type === "episode") return { season, seasonIndex, itemIndex, value: item.episode };
  }
  return null;
}

export function findChallenge(content: Content, id: string): Found<Challenge> | null {
  for (const [seasonIndex, season] of content.seasons.entries()) {
    const itemIndex = season.items.findIndex((i) => i.type === "challenge" && i.challenge.id === id);
    const item = season.items[itemIndex];
    if (item?.type === "challenge") return { season, seasonIndex, itemIndex, value: item.challenge };
  }
  return null;
}

export const findSeason = (content: Content, id: string) => content.seasons.find((s) => s.id === id);

/** Collections in the order children see them. */
export const sortedSeasons = (content: Content): Season[] => [...content.seasons].sort((a, b) => a.order - b.order);

export const storiesOf = (season: Season): Episode[] =>
  season.items.flatMap((i) => (i.type === "episode" ? [i.episode] : []));

export const challengesOf = (season: Season): Challenge[] =>
  season.items.flatMap((i) => (i.type === "challenge" ? [i.challenge] : []));

/** How many stories come before this challenge in its collection ("after story 4"). */
export function storiesBefore(season: Season, challengeId: string): number {
  const index = season.items.findIndex((i) => i.type === "challenge" && i.challenge.id === challengeId);
  return season.items.slice(0, Math.max(0, index)).filter((i) => i.type === "episode").length;
}

/** Every id in the file: collections, stories, challenges and questions (ids must be unique across all of them). */
export function allIds(content: Content): Set<string> {
  const ids = new Set<string>();
  for (const season of content.seasons) {
    ids.add(season.id);
    for (const item of season.items) {
      if (item.type === "episode") {
        ids.add(item.episode.id);
        item.episode.pausePoints?.forEach((p) => ids.add(p.question.id));
      } else {
        ids.add(item.challenge.id);
        item.challenge.questions.forEach((q) => ids.add(q.id));
      }
    }
  }
  return ids;
}

/** Every picture path the content uses, so only those uploads are sent with a save. */
export function picturesIn(content: Content): Set<string> {
  const paths = new Set<string>();
  const add = (p: string | undefined) => {
    if (p) paths.add(p);
  };
  const question = (q: Question) => {
    add(q.promptImage);
    q.options.forEach((o) => add(o.image));
  };
  for (const season of content.seasons) {
    add(season.posterImage);
    for (const item of season.items) {
      if (item.type === "episode") {
        add(item.episode.thumbnail);
        item.episode.pausePoints?.forEach((p) => question(p.question));
      } else {
        add(item.challenge.sticker);
        item.challenge.questions.forEach(question);
      }
    }
  }
  return paths;
}

/* ---------- New ids ---------- */

/** The first `${prefix}${n}` (n = 1, 2, …) after the highest one in use, that isn't taken. */
function nextNumbered(prefix: string, taken: ReadonlySet<string>): string {
  const pattern = new RegExp(`^${prefix.replace(/[-]/g, "\\-")}(\\d+)$`);
  let highest = 0;
  for (const id of taken) {
    const match = pattern.exec(id);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  let n = highest + 1;
  while (taken.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

/** "s1" for the sample layout; collections with other ids get "-" before the letter ("numbers-e1"). */
const itemPrefix = (seasonId: string, letter: "e" | "c") =>
  /^s\d+$/.test(seasonId) ? `${seasonId}${letter}` : `${seasonId}-${letter}`;

/**
 * Ids for new things: s4 (collection), s1e9 (story), s1c3 (challenge).
 * `reserved` holds ids to avoid besides the ones in `content` (for example ones
 * deleted since the last save, so a device's progress never points at a new story).
 */
export const newSeasonId = (content: Content, reserved: Iterable<string> = []) =>
  nextNumbered("s", new Set([...allIds(content), ...reserved]));

export const newStoryId = (content: Content, seasonId: string, reserved: Iterable<string> = []) =>
  nextNumbered(itemPrefix(seasonId, "e"), new Set([...allIds(content), ...reserved]));

export const newChallengeId = (content: Content, seasonId: string, reserved: Iterable<string> = []) =>
  nextNumbered(itemPrefix(seasonId, "c"), new Set([...allIds(content), ...reserved]));

/** Question ids hang off their story or challenge: s1e9-p1, s1c3-q2. */
export const newQuestionId = (ownerId: string, kind: "p" | "q", taken: ReadonlySet<string>) =>
  nextNumbered(`${ownerId}-${kind}`, taken);

/** A web address name for a new collection, from its title: "Animal Stories" → "animal-stories". */
export function newSlug(content: Content, title: string): string {
  const taken = new Set(content.seasons.map((s) => s.slug));
  const base = slugify(title) || "collection";
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Answer ids are letters: the first of a, b, c, d not used yet. */
export const nextOptionId = (question: Pick<Question, "options">) =>
  ["a", "b", "c", "d"].find((l) => !question.options.some((o) => o.id === l)) ?? `o${question.options.length + 1}`;

/* ---------- New things ---------- */

export function blankQuestion(id: string, skill: string): Question {
  return {
    id,
    promptText: text(),
    options: [
      { id: "a", image: "" },
      { id: "b", image: "" },
    ],
    correctOptionId: "a",
    skill,
  };
}

export function blankStory(content: Content, seasonId: string, reserved: Iterable<string> = []): Episode {
  const season = findSeason(content, seasonId);
  return {
    id: newStoryId(content, seasonId, reserved),
    number: (season ? storiesOf(season).length : 0) + 1,
    title: text(),
    youtubeId: "",
    durationSec: 0,
    thumbnail: "",
    skills: [],
    homeActivity: text(),
  };
}

export const CHALLENGE_QUESTIONS = 5;

export function blankChallenge(content: Content, seasonId: string, reserved: Iterable<string> = []): Challenge {
  const id = newChallengeId(content, seasonId, reserved);
  const skill = Object.keys(content.skills)[0] ?? "";
  return {
    id,
    title: text(),
    sticker: "",
    questions: Array.from({ length: CHALLENGE_QUESTIONS }, (_, i) => blankQuestion(`${id}-q${i + 1}`, skill)),
  };
}

const COLORS: SeasonColor[] = ["sky", "coral", "leaf", "grape"];

/** A new "Coming soon" collection at the end, in the next color along. */
export function blankSeason(content: Content, title: LocalizedText, reserved: Iterable<string> = []): Season {
  const last = sortedSeasons(content).at(-1);
  const color = COLORS[(COLORS.indexOf(last?.color ?? "grape") + 1) % COLORS.length]!;
  return {
    id: newSeasonId(content, reserved),
    slug: newSlug(content, title.en),
    order: (last?.order ?? 0) + 1,
    title: { en: title.en.trim(), rw: title.rw.trim() },
    color,
    posterImage: "",
    status: "coming_soon",
    items: [],
  };
}

/* ---------- Changes ---------- */

/** Story numbers count 1, 2, 3… in each collection, in the order children watch them. */
export function renumberStories(content: Content): Content {
  const next = clone(content);
  for (const season of next.seasons) {
    let n = 0;
    for (const item of season.items) if (item.type === "episode") item.episode.number = ++n;
  }
  return next;
}

/** Collections keep `order` 1, 2, 3… in the order they are listed. */
function renumberSeasons(seasons: Season[]): Season[] {
  return seasons.map((s, i) => ({ ...s, order: i + 1 }));
}

export function updateStory(content: Content, id: string, change: (e: Episode) => Episode): Content {
  const found = findStory(content, id);
  if (!found) return content;
  const next = clone(content);
  const item = next.seasons[found.seasonIndex]!.items[found.itemIndex]!;
  if (item.type === "episode") item.episode = change(item.episode);
  return next;
}

export function updateChallenge(content: Content, id: string, change: (c: Challenge) => Challenge): Content {
  const found = findChallenge(content, id);
  if (!found) return content;
  const next = clone(content);
  const item = next.seasons[found.seasonIndex]!.items[found.itemIndex]!;
  if (item.type === "challenge") item.challenge = change(item.challenge);
  return next;
}

export function updateSeason(content: Content, id: string, change: (s: Season) => Season): Content {
  const next = clone(content);
  next.seasons = next.seasons.map((s) => (s.id === id ? change(s) : s));
  return next;
}

/** Adds a story at the end of a collection. */
export function addStory(content: Content, seasonId: string, story: Episode): Content {
  const next = clone(content);
  next.seasons.find((s) => s.id === seasonId)?.items.push({ type: "episode", episode: clone(story) });
  return renumberStories(next);
}

/** Adds a challenge at the end of a collection, after its last stories. */
export function addChallenge(content: Content, seasonId: string, challenge: Challenge): Content {
  const next = clone(content);
  next.seasons.find((s) => s.id === seasonId)?.items.push({ type: "challenge", challenge: clone(challenge) });
  return next;
}

export function addSeason(content: Content, season: Season): Content {
  const next = clone(content);
  next.seasons = renumberSeasons([...sortedSeasons(next), clone(season)]);
  return next;
}

/** Removes a story or a challenge, wherever it is. */
export function deleteItem(content: Content, id: string): Content {
  const next = clone(content);
  for (const season of next.seasons) {
    season.items = season.items.filter((i) => (i.type === "episode" ? i.episode.id : i.challenge.id) !== id);
  }
  return renumberStories(next);
}

/** Only an empty collection can be deleted, so no story is lost by accident. */
export function deleteSeason(content: Content, id: string): Content {
  const season = findSeason(content, id);
  if (!season || season.items.length) return content;
  const next = clone(content);
  next.seasons = renumberSeasons(sortedSeasons(next).filter((s) => s.id !== id));
  return next;
}

/**
 * Moves a story one place earlier or later among the stories of its collection.
 * Challenges keep their places (after every 4 stories), so moving story 5 up
 * swaps it with story 4 across the challenge between them.
 */
export function moveStory(content: Content, id: string, direction: Direction): Content {
  const found = findStory(content, id);
  if (!found) return content;
  const slots = found.season.items.flatMap((item, i) => (item.type === "episode" ? [i] : []));
  const at = slots.indexOf(found.itemIndex);
  const other = slots[at + direction];
  if (other === undefined) return content;
  const next = clone(content);
  const items = next.seasons[found.seasonIndex]!.items;
  [items[found.itemIndex], items[other]] = [items[other]!, items[found.itemIndex]!];
  return renumberStories(next);
}

/** Moves a story to the end of another collection. */
export function moveStoryToSeason(content: Content, id: string, seasonId: string): Content {
  const found = findStory(content, id);
  if (!found || found.season.id === seasonId || !findSeason(content, seasonId)) return content;
  return addStory(deleteItem(content, id), seasonId, found.value);
}

export function moveSeason(content: Content, id: string, direction: Direction): Content {
  const list = sortedSeasons(content);
  const at = list.findIndex((s) => s.id === id);
  const to = at + direction;
  if (at < 0 || to < 0 || to >= list.length) return content;
  [list[at], list[to]] = [list[to]!, list[at]!];
  return { ...clone(content), seasons: renumberSeasons(clone(list)) };
}

/** Moves an entry of a plain list (featured stories). */
export function moveInList<T>(list: readonly T[], index: number, direction: Direction): T[] {
  const to = index + direction;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return [...list];
  const next = [...list];
  [next[index], next[to]] = [next[to]!, next[index]!];
  return next;
}

/* ---------- Featured stories ---------- */

/** Stories children can watch now: those in "Live" collections, in order. */
export function liveStories(content: Content): { story: Episode; season: Season }[] {
  return sortedSeasons(content)
    .filter((s) => s.status === "published")
    .flatMap((season) => storiesOf(season).map((story) => ({ story, season })));
}

/**
 * The featured list the save needs: only stories in "Live" collections, each once,
 * at most 6, in the order chosen.
 */
export function cleanFeatured(site: Site, content: Content): Site {
  const live = new Set(liveStories(content).map(({ story }) => story.id));
  const featured = site.featured.filter((id, i) => live.has(id) && site.featured.indexOf(id) === i).slice(0, MAX_FEATURED);
  return { ...clone(site), featured };
}

/** Everything a save sends, made consistent: stories renumbered, featured cleaned. */
export function prepareForSave(content: Content, site: Site): { seasons: Content; site: Site } {
  const seasons = renumberStories(content);
  return { seasons, site: cleanFeatured(site, seasons) };
}
