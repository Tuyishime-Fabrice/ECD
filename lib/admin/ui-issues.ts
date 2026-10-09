/**
 * Problems in the dashboard: the same checks the save runs (lib/admin/save.ts,
 * checkSave), done in the browser first so most mistakes show up next to the
 * field at once. Pictures are checked by the server only, since the browser
 * can't see which files are saved. Also works out which screen and field each
 * problem belongs to.
 */
import { siteSchema, validateSite, type SiteIssue } from "@/content/site";
import { validateContent } from "@/content/validate";
import type { Issue } from "./save";
import { plainMessage, plainSiteError, whereInContent } from "./wording";

export type { Issue };

type Path = readonly (string | number)[];

const valueAt = (root: unknown, path: Path): unknown =>
  path.reduce<unknown>(
    (node, key) => (node && typeof node === "object" ? (node as Record<string | number, unknown>)[key] : undefined),
    root,
  );

const PICTURE_FIELDS: Record<string, string> = {
  thumbnail: "Add a picture.",
  posterImage: "Add a poster picture.",
  sticker: "Add a sticker picture.",
  image: "Add a picture for this answer.",
  promptImage: "Add a picture, or remove it.",
};

const ENGLISH: Record<string, string> = {
  title: "Write the English title.",
  homeActivity: "Write the activity in English.",
  promptText: "Write the question in English.",
};

/** Clearer words for the mistakes people make most while filling in a form. */
export function friendlyProblem(raw: unknown, path: Path, problem: string): string {
  const key = path.at(-1);
  const value = valueAt(raw, path);
  const empty = typeof value === "string" && value.trim() === "";
  if (typeof key === "string" && key in PICTURE_FIELDS && empty) return PICTURE_FIELDS[key]!;
  if (key === "youtubeId" && empty) return "Paste the YouTube link.";
  if (key === "durationSec" && typeof value === "number" && value <= 0) return "Add how long the story is.";
  if (key === "en" && empty) return ENGLISH[String(path.at(-2))] ?? "Write this in English.";
  if (key === "skill" && empty) return "Choose a skill.";
  if (key === "whatsapp") return "Write the number with its country code, like +250 781 234 567, or leave it empty.";
  if (problem === "a question needs at least 2 options") return "Add at least 2 answers.";
  if (problem === "a question can have at most 4 options") return "A question can have at most 4 answers.";
  return problem.charAt(0).toUpperCase() + problem.slice(1);
}

/** Everything the save would refuse, except pictures that aren't saved. Same shape as the server's 422 `issues`. */
export function checkDraft(seasons: unknown, site: unknown): Issue[] {
  const issues: Issue[] = [];
  const content = validateContent(seasons, () => true);
  if (!content.ok) {
    for (const { path, message, missingPicture } of content.issues) {
      const problem = friendlyProblem(seasons, path, plainMessage({ message, missingPicture }));
      issues.push({ file: "seasons", path, message: `${whereInContent(seasons, path)}: ${problem}`, problem });
    }
  }
  let siteIssues: SiteIssue[] = [];
  if (content.ok) {
    const checked = validateSite(site, content.content);
    if (!checked.ok) siteIssues = checked.issues;
  } else {
    const shape = siteSchema.safeParse(site);
    if (!shape.success) {
      siteIssues = shape.error.issues.map((i) => ({
        path: i.path.map((k) => (typeof k === "number" ? k : String(k))),
        message: i.message,
      }));
    }
  }
  for (const issue of siteIssues) {
    const message = plainSiteError(issue, seasons);
    const problem = message.slice(message.indexOf(": ") + 2);
    issues.push({ file: "site", path: issue.path, message, problem: friendlyProblem(site, issue.path, problem) });
  }
  return issues;
}

/* ---------- Where each problem belongs ---------- */

export type Target =
  | { kind: "story" | "challenge" | "collection"; id: string; field: string }
  | { kind: "settings"; field: string }
  | { kind: "general"; field: "" };

const SEASON_FIELDS = new Set(["id", "slug", "order", "title", "color", "posterImage", "status", "items"]);

/**
 * The screen and field a problem is about. `seasons` must be the content the
 * problem was found in (positions in `path` refer to it).
 * Fields are dotted paths inside the item: "title.en", "pausePoints.0.atSec".
 */
export function issueTarget(seasons: unknown, issue: Pick<Issue, "file" | "path">): Target {
  const { path } = issue;
  if (issue.file === "site") {
    const field = path[0] === "featured" ? "featured" : path.join(".");
    return { kind: "settings", field };
  }
  if (issue.file !== "seasons" || path[0] !== "seasons" || typeof path[1] !== "number") {
    return { kind: "general", field: "" };
  }
  const season = valueAt(seasons, path.slice(0, 2)) as { id?: unknown } | undefined;
  const seasonId = typeof season?.id === "string" ? season.id : "";
  const rest = path.slice(2);
  if (rest[0] === "items" && typeof rest[1] === "number") {
    const item = valueAt(seasons, path.slice(0, 4)) as { type?: unknown } | undefined;
    const kind = item?.type === "episode" ? "story" : item?.type === "challenge" ? "challenge" : null;
    const inner = kind ? (valueAt(item, [item!.type as string]) as { id?: unknown } | undefined) : undefined;
    if (kind && typeof inner?.id === "string") {
      return { kind, id: inner.id, field: rest.slice(3).join(".") };
    }
    return { kind: "collection", id: seasonId, field: "items" };
  }
  const field = rest.length && SEASON_FIELDS.has(String(rest[0])) ? rest.join(".") : "";
  return { kind: "collection", id: seasonId, field };
}

/** The id a field's input gets, so a problem can link to it: "title.en" → "f-title-en". */
export const fieldId = (field: string) => `f-${field.replace(/[^A-Za-z0-9]+/g, "-")}`.replace(/-$/, "");

/** Where to go to fix a problem; null for problems with no screen of their own. */
export function targetHref(target: Target): string | null {
  const hash = target.field ? `#${fieldId(target.field)}` : "";
  switch (target.kind) {
    case "story":
      return `/admin/stories/${encodeURIComponent(target.id)}${hash}`;
    case "challenge":
      return `/admin/challenges/${encodeURIComponent(target.id)}${hash}`;
    case "collection":
      return `/admin/collections/${encodeURIComponent(target.id)}${hash}`;
    case "settings":
      return `/admin/settings${hash}`;
    default:
      return null;
  }
}

export type Located = Issue & { target: Target };

export const locate = (seasons: unknown, issues: Issue[]): Located[] =>
  issues.map((issue) => ({ ...issue, target: issueTarget(seasons, issue) }));

/** The problems for one story, challenge, collection or the settings, by field. */
export function problemsFor(issues: Located[], kind: Target["kind"], id?: string): Map<string, string[]> {
  const byField = new Map<string, string[]>();
  for (const { target, problem } of issues) {
    if (target.kind !== kind || ("id" in target && target.id !== id)) continue;
    const list = byField.get(target.field) ?? [];
    if (!list.includes(problem)) list.push(problem);
    byField.set(target.field, list);
  }
  return byField;
}
