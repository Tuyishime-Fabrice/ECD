/**
 * Rewords validation problems for the dashboard. The build talks about the file
 * ("Season 1 › item 2 (episode "s1e2") › thumbnail"); the dashboard talks about
 * what the person sees ("Collection 1 "Counting Stories" › story 2 "Two Bananas" › picture").
 */
import type { ContentIssue } from "@/content/validate";
import type { SiteIssue } from "@/content/site";

type Path = readonly (string | number)[];

const FIELDS: Record<string, string> = {
  _note: "note",
  atSec: "time",
  color: "color",
  contact: "contact",
  correctOptionId: "right answer",
  durationSec: "length",
  en: "English",
  featured: "Featured stories",
  homeActivity: '"Do it at home" activity',
  id: "id",
  image: "picture",
  items: "stories and challenges",
  label: "label",
  number: "number",
  options: "answers",
  order: "order",
  pausePoints: "questions during the story",
  posterImage: "poster picture",
  promptAudio: "recording",
  promptImage: "question picture",
  promptText: "question",
  questions: "questions",
  rw: "Kinyarwanda",
  seasons: "collections",
  skill: "skill",
  skills: "skills",
  slug: "web address name",
  status: '"Live" or "Coming soon"',
  sticker: "sticker picture",
  thumbnail: "picture",
  title: "title",
  whatsapp: "WhatsApp number",
  youtubeId: "YouTube link",
};

const LISTS = new Set(["seasons", "items", "questions", "pausePoints", "options"]);
const WRAPPERS = new Set(["episode", "challenge", "question"]);

const child = (node: unknown, key: string | number): unknown =>
  node && typeof node === "object" ? (node as Record<string | number, unknown>)[key] : undefined;

const titled = (node: unknown) => {
  const en = child(child(node, "title"), "en");
  return typeof en === "string" && en.trim() ? ` "${en.trim()}"` : "";
};

/** "story 2 "Two Bananas"", "answer 3", … for entry `index` of the list `list` (found under `name`). */
function entry(name: string | number | undefined, list: unknown, index: number): string {
  const item = child(list, index);
  switch (name) {
    case "seasons":
      return `Collection ${index + 1}${titled(item)}`;
    case "items": {
      const type = child(item, "type");
      if (type !== "episode" && type !== "challenge") return `item ${index + 1}`;
      // Stories and challenges are numbered separately, as the dashboard lists them.
      const before = Array.isArray(list) ? list.slice(0, index + 1) : [];
      const count = before.filter((i) => child(i, "type") === type).length;
      return `${type === "episode" ? "story" : "challenge"} ${count}${titled(child(item, type))}`;
    }
    case "pausePoints":
      return Array.isArray(list) && list.length > 1 ? `question during the story ${index + 1}` : "question during the story";
    case "questions":
      return `question ${index + 1}`;
    case "options":
      return `answer ${index + 1}`;
    case "skills":
      return `skill ${index + 1}`;
    default:
      return `${FIELDS[String(name)] ?? String(name)} ${index + 1}`;
  }
}

/** Where a problem is in seasons.json, in the dashboard's words. */
export function whereInContent(raw: unknown, path: Path): string {
  const parts: string[] = [];
  let node: unknown = raw;
  path.forEach((key, i) => {
    const prev = path[i - 1];
    if (typeof key === "number") {
      parts.push(entry(prev, node, key));
    } else if (WRAPPERS.has(key) && i > 0) {
      // Described by the list entry above it.
    } else if ((LISTS.has(key) || key === "skills") && typeof path[i + 1] === "number") {
      // Described by the index that follows.
    } else if (prev === "skills" && i === 1) {
      parts.push(`skill "${key}"`);
    } else {
      parts.push(FIELDS[key] ?? key);
    }
    node = child(node, key);
  });
  return parts.join(" › ") || "Stories file";
}

const clock = (sec: string) => {
  const s = Math.round(Number(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const PAUSE_AFTER_END = /^(\d+(?:\.\d+)?)s is after the end of the episode \((\d+(?:\.\d+)?)s\)$/;

/** Swaps the file's words for the dashboard's, leaving anything in "quotes" (ids, titles) alone. */
const reword = (text: string) =>
  text
    .split(/("[^"]*")/)
    .map((part, i) =>
      i % 2
        ? part
        : part
            .replace(/\bdurationSec\b/g, "the length")
            .replace(/\bSeason (\d+)/g, "Collection $1")
            .replace(/\bseasons\b/g, "collections")
            .replace(/\bseason\b/g, "collection")
            .replace(/\bepisodes\b/g, "stories")
            .replace(/\bepisode\b/g, "story"),
    )
    .join("");

/** A validation message in the dashboard's words. */
export function plainMessage(issue: Pick<ContentIssue, "message" | "missingPicture">): string {
  const src = issue.missingPicture;
  if (src) {
    return src.startsWith("/images/uploads/")
      ? `the picture "${src}" isn't saved. Upload it again.`
      : `the picture "${src}" isn't in the app. Upload a picture instead.`;
  }
  const { message } = issue;
  const skill = /^skill "(.+)" is not listed in "skills" at the top of the file$/.exec(message);
  if (skill) return `skill "${skill[1]}" doesn't exist. Pick skills from the list.`;
  if (/^".*" is not one of this question's options \(.*\)$/.test(message)) return "choose which answer is right";
  const late = PAUSE_AFTER_END.exec(message);
  if (late) return `the question at ${clock(late[1]!)} comes after the story ends (${clock(late[2]!)})`;
  if (message === "a published season needs at least one item") return 'a "Live" collection needs at least one story';
  return reword(message);
}

/** A site.json problem in the dashboard's words: "Settings › Featured stories › 2: …". */
export function plainSiteError(issue: SiteIssue, seasons: unknown): string {
  const where = ["Settings", ...issue.path.map((k) => (typeof k === "number" ? String(k + 1) : (FIELDS[k] ?? k)))]
    .filter((part, i, all) => !(part === "contact" && all[i + 1] === "WhatsApp number"))
    .join(" › ");
  const notLive = /^"(.+)" is not a story in a published collection$/.exec(issue.message);
  if (notLive) {
    const title = storyTitle(seasons, notLive[1]!);
    const story = title ? `"${title}"` : `the story "${notLive[1]}"`;
    return `${where}: ${story} isn't in a "Live" collection any more. Remove it from Featured stories.`;
  }
  return `${where}: ${issue.message}`;
}

function storyTitle(seasons: unknown, id: string): string | undefined {
  const list = child(seasons, "seasons");
  if (!Array.isArray(list)) return undefined;
  for (const season of list) {
    const items = child(season, "items");
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      const episode = child(item, "episode");
      const en = child(child(episode, "title"), "en");
      if (child(episode, "id") === id && typeof en === "string") return en;
    }
  }
  return undefined;
}
