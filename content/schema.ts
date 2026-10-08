/**
 * Shape of content/seasons.json. The build checks the file against this
 * schema (scripts/validate-content.ts) and stops with a readable list of
 * problems if anything is wrong.
 *
 * This file is also run directly by Node during the build, so keep imports
 * relative with a ".ts" extension and avoid TypeScript-only runtime syntax.
 */
import { z } from "zod";

const ID = /^[a-z0-9][a-z0-9-]*$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

const id = z
  .string()
  .regex(ID, 'use only lowercase letters, numbers and "-" (for example "s1e1")');

export const localizedTextSchema = z.strictObject({
  rw: z.string(),
  en: z.string().min(1, "English text is required (it is used when Kinyarwanda is missing)"),
});

export const imagePathSchema = z
  .string()
  .regex(/^\/images\/[^\s]+\.(svg|png|jpe?g|webp)$/, 'must look like "/images/folder/picture.svg"');

const thumbnailSchema = z
  .string()
  .regex(
    /^(\/images\/[^\s]+\.(svg|png|jpe?g|webp)|https:\/\/\S+)$/,
    'must look like "/images/thumbs/picture.svg" or be a full https:// link',
  );

export const audioPathSchema = z
  .string()
  .regex(/^\/audio\/[^\s]+\.(mp3|m4a|aac|ogg|opus|wav)$/, 'must look like "/audio/file.mp3"');

const youtubeIdSchema = z.string().superRefine((value, ctx) => {
  if (value === "DEMO" || YOUTUBE_ID.test(value)) return;
  const fromUrl = value.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  ctx.addIssue({
    code: "custom",
    message: fromUrl
      ? `this is a full link; use only the video ID "${fromUrl[1]}"`
      : `"${value}" is not a YouTube video ID (it must be exactly 11 characters, e.g. "dQw4w9WgXcQ", or "DEMO")`,
  });
});

export const questionSchema = z
  .strictObject({
    id,
    promptText: localizedTextSchema,
    promptAudio: z
      .strictObject({ rw: audioPathSchema.optional(), en: audioPathSchema.optional() })
      .optional(),
    promptImage: imagePathSchema.optional(),
    options: z
      .array(
        z.strictObject({
          id: z.string().min(1, "option id is empty"),
          image: imagePathSchema,
          label: z.string().optional(),
        }),
      )
      .min(2, "a question needs at least 2 options")
      .max(4, "a question can have at most 4 options"),
    correctOptionId: z.string(),
    skill: id,
  })
  .superRefine((q, ctx) => {
    const optionIds = q.options.map((o) => o.id);
    if (!optionIds.includes(q.correctOptionId)) {
      ctx.addIssue({
        code: "custom",
        path: ["correctOptionId"],
        message: `"${q.correctOptionId}" is not one of this question's options (${optionIds.join(", ")})`,
      });
    }
    const dup = optionIds.find((o, i) => optionIds.indexOf(o) !== i);
    if (dup) {
      ctx.addIssue({ code: "custom", path: ["options"], message: `option id "${dup}" is used twice` });
    }
  });

export const episodeSchema = z
  .strictObject({
    id,
    number: z.int().positive("number must be 1 or more"),
    title: localizedTextSchema,
    youtubeId: youtubeIdSchema,
    durationSec: z.number().positive("durationSec must be more than 0"),
    thumbnail: thumbnailSchema.optional(),
    skills: z.array(id),
    homeActivity: localizedTextSchema,
    pausePoints: z
      .array(z.strictObject({ atSec: z.number().min(0), question: questionSchema }))
      .optional(),
  })
  .superRefine((e, ctx) => {
    e.pausePoints?.forEach((p, i) => {
      if (p.atSec >= e.durationSec) {
        ctx.addIssue({
          code: "custom",
          path: ["pausePoints", i, "atSec"],
          message: `${p.atSec}s is after the end of the episode (${e.durationSec}s)`,
        });
      }
    });
  });

export const challengeSchema = z
  .strictObject({
    id,
    title: localizedTextSchema,
    sticker: imagePathSchema,
    questions: z.array(questionSchema),
  })
  .superRefine((c, ctx) => {
    if (c.questions.length !== 5) {
      ctx.addIssue({
        code: "custom",
        path: ["questions"],
        message: `a challenge needs exactly 5 questions (found ${c.questions.length})`,
      });
    }
  });

export const SEASON_COLORS = ["sky", "coral", "leaf", "grape"] as const;

export const seasonSchema = z
  .strictObject({
    id,
    slug: id,
    order: z.int(),
    title: localizedTextSchema,
    color: z.enum(SEASON_COLORS, { error: `color must be one of: ${SEASON_COLORS.join(", ")}` }),
    posterImage: imagePathSchema,
    status: z.enum(["published", "coming_soon"], { error: 'status must be "published" or "coming_soon"' }),
    items: z.array(
      z.discriminatedUnion(
        "type",
        [
          z.strictObject({ type: z.literal("episode"), episode: episodeSchema }),
          z.strictObject({ type: z.literal("challenge"), challenge: challengeSchema }),
        ],
        { error: 'each item needs "type": "episode" or "type": "challenge"' },
      ),
    ),
  })
  .superRefine((s, ctx) => {
    if (s.status === "published" && s.items.length === 0) {
      ctx.addIssue({ code: "custom", path: ["items"], message: "a published season needs at least one item" });
    }
  });

export const contentSchema = z
  .strictObject({
    _note: z.string().optional(),
    /** Plain-language names of skills, shown to parents. */
    skills: z.record(id, localizedTextSchema),
    seasons: z.array(seasonSchema).min(1, "add at least one season"),
  })
  .superRefine((c, ctx) => {
    // Every id must be unique across the whole file.
    const seen = new Map<string, string>();
    // "Season 1 › item 3" — the same wording the error list uses for locations.
    const where = (path: (string | number)[]) => {
      const season = Number(path[1]) + 1;
      return typeof path[3] === "number" ? `Season ${season} › item ${path[3] + 1}` : `Season ${season}`;
    };
    const claim = (kind: string, value: string, path: (string | number)[]) => {
      const key = `${kind === "slug" ? "slug" : "id"}:${value}`;
      const first = seen.get(key);
      if (first) {
        ctx.addIssue({ code: "custom", path, message: `${kind} "${value}" is already used in ${first}` });
      } else {
        seen.set(key, where(path));
      }
    };
    const knownSkill = (skill: string, path: (string | number)[]) => {
      if (!(skill in c.skills)) {
        ctx.addIssue({
          code: "custom",
          path,
          message: `skill "${skill}" is not listed in "skills" at the top of the file`,
        });
      }
    };

    c.seasons.forEach((season, si) => {
      claim("season id", season.id, ["seasons", si, "id"]);
      claim("slug", season.slug, ["seasons", si, "slug"]);
      season.items.forEach((item, ii) => {
        const base = ["seasons", si, "items", ii];
        if (item.type === "episode") {
          const e = item.episode;
          claim("episode id", e.id, [...base, "episode", "id"]);
          e.skills.forEach((s, k) => knownSkill(s, [...base, "episode", "skills", k]));
          e.pausePoints?.forEach((p, pi) => {
            const qp = [...base, "episode", "pausePoints", pi, "question"];
            claim("question id", p.question.id, [...qp, "id"]);
            knownSkill(p.question.skill, [...qp, "skill"]);
          });
        } else {
          const ch = item.challenge;
          claim("challenge id", ch.id, [...base, "challenge", "id"]);
          ch.questions.forEach((q, qi) => {
            const qp = [...base, "challenge", "questions", qi];
            claim("question id", q.id, [...qp, "id"]);
            knownSkill(q.skill, [...qp, "skill"]);
          });
        }
      });
    });
  });

export type LocalizedText = z.infer<typeof localizedTextSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Episode = z.infer<typeof episodeSchema>;
export type Challenge = z.infer<typeof challengeSchema>;
export type Season = z.infer<typeof seasonSchema>;
export type SeasonColor = Season["color"];
export type SeasonItem = Season["items"][number];
export type Content = z.infer<typeof contentSchema>;
