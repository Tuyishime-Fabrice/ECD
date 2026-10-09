/**
 * Checks content/seasons.json and explains every problem in plain words.
 * Used by the build (scripts/validate-content.ts), the app loader and tests.
 */
import { contentSchema, type Content, type Question } from "./schema.ts";

/** One problem, with where it is, so a form can show it next to the field. `errors[i]` describes `issues[i]`. */
export type ContentIssue = { path: (string | number)[]; message: string; missingPicture?: string };

export type ValidationResult =
  | { ok: true; content: Content; warnings: string[]; missingAudio: string[] }
  | { ok: false; errors: string[]; issues: ContentIssue[]; warnings: string[]; missingAudio: string[] };

type Path = readonly PropertyKey[];
type Node = Record<PropertyKey, unknown> | undefined;

const CONTAINERS = new Set(["seasons", "items", "questions", "pausePoints", "options", "skills"]);
const WRAPPERS = new Set(["episode", "challenge", "question"]);

const quoted = (v: unknown) => (typeof v === "string" && v ? ` "${v}"` : "");

/** Turns ["seasons", 0, "items", 4, "challenge", "questions", 2] into "Season 1 "numbers" › item 5 (challenge "s1c1") › question 3 "s1c1-q3"". */
export function describePath(raw: unknown, path: Path): string {
  const parts: string[] = [];
  let node = raw as Node;
  path.forEach((key, i) => {
    const prev = path[i - 1];
    const next = (node?.[key as keyof typeof node] ?? undefined) as Node;
    if (typeof key === "number") {
      if (prev === "seasons") parts.push(`Season ${key + 1}${quoted(next?.slug ?? next?.id)}`);
      else if (prev === "items") {
        const kind = next?.type === "episode" || next?.type === "challenge" ? String(next.type) : "item";
        const inner = (next?.episode ?? next?.challenge) as Node;
        parts.push(`item ${key + 1} (${kind}${quoted(inner?.id)})`);
      } else if (prev === "questions") parts.push(`question ${key + 1}${quoted(next?.id)}`);
      else if (prev === "pausePoints") parts.push(`pause point ${key + 1}`);
      else if (prev === "options") parts.push(`option ${key + 1}${quoted(next?.id)}`);
      else parts.push(`${String(prev)} #${key + 1}`);
    } else if (WRAPPERS.has(String(key))) {
      // "episode"/"challenge"/"question" are described by their parent.
    } else if (CONTAINERS.has(String(key)) && typeof path[i + 1] === "number") {
      // Described by the index that follows.
    } else if (prev === "skills" && i === 1) {
      parts.push(`skill "${String(key)}"`);
    } else {
      parts.push(String(key));
    }
    node = next;
  });
  return parts.join(" › ") || "top of the file";
}

function friendly(message: string): string {
  if (/received undefined/.test(message)) return "is missing";
  return message.replace(/^Invalid input: /, "");
}

function allQuestions(content: Content): { question: Question; path: (string | number)[] }[] {
  const out: { question: Question; path: (string | number)[] }[] = [];
  content.seasons.forEach((season, si) =>
    season.items.forEach((item, ii) => {
      const base = ["seasons", si, "items", ii];
      if (item.type === "episode") {
        item.episode.pausePoints?.forEach((p, pi) =>
          out.push({ question: p.question, path: [...base, "episode", "pausePoints", pi, "question"] }),
        );
      } else {
        item.challenge.questions.forEach((q, qi) =>
          out.push({ question: q, path: [...base, "challenge", "questions", qi] }),
        );
      }
    }),
  );
  return out;
}

/**
 * @param fileExists receives a public path like "/images/a.svg" and says
 *   whether that file exists in /public.
 */
export function validateContent(raw: unknown, fileExists: (publicPath: string) => boolean): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const issues: ContentIssue[] = [];
  const report = (issue: ContentIssue) => {
    const text = `${describePath(raw, issue.path)}: ${issue.message}`;
    if (errors.includes(text)) return;
    errors.push(text);
    issues.push(issue);
  };

  const parsed = contentSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = issue.path.map((k) => (typeof k === "number" ? k : String(k)));
      report({ path, message: friendly(issue.message) });
    }
    return { ok: false, errors, issues, warnings, missingAudio: [] };
  }

  const content = parsed.data;
  const image = (src: string | undefined, path: (string | number)[]) => {
    if (src && src.startsWith("/") && !fileExists(src)) {
      const message = `picture "${src}" was not found (expected the file public${src})`;
      report({ path, message, missingPicture: src });
    }
  };

  content.seasons.forEach((season, si) => {
    image(season.posterImage, ["seasons", si, "posterImage"]);
    let lastNumber = 0;
    season.items.forEach((item, ii) => {
      const base = ["seasons", si, "items", ii];
      if (item.type === "episode") {
        image(item.episode.thumbnail, [...base, "episode", "thumbnail"]);
        if (item.episode.number <= lastNumber) {
          warnings.push(
            `${describePath(raw, base)}: episode number ${item.episode.number} is not after the previous episode (${lastNumber})`,
          );
        }
        lastNumber = item.episode.number;
      } else {
        image(item.challenge.sticker, [...base, "challenge", "sticker"]);
      }
    });
  });

  const missingAudio = new Set<string>();
  for (const { question, path } of allQuestions(content)) {
    image(question.promptImage, [...path, "promptImage"]);
    question.options.forEach((o, oi) => image(o.image, [...path, "options", oi, "image"]));
    for (const src of Object.values(question.promptAudio ?? {})) {
      if (src && !fileExists(src)) missingAudio.add(src);
    }
  }

  const missing = [...missingAudio].sort();
  if (errors.length) return { ok: false, errors, issues, warnings, missingAudio: missing };
  return { ok: true, content, warnings, missingAudio: missing };
}
