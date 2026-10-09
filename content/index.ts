/**
 * Build-time content loader. Only import this from Server Components
 * (pages, layouts, generateStaticParams) — never from "use client" files.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { DEMO_YOUTUBE_ID } from "@/lib/brand";
import type { Content, Episode, Question } from "./schema";
import raw from "./seasons.json";
import rawSite from "./site.json";
import { validateSite, whatsappContact } from "./site";
import type {
  ChallengeView,
  EpisodeView,
  ItemCard,
  SeasonCard,
  SkillInfo,
  StickerSlot,
} from "./types";
import { validateContent } from "./validate";

type EpisodeCardOf = { card: Extract<ItemCard, { type: "episode" }>; season: SeasonCard };

type Loaded = {
  seasons: SeasonCard[];
  episodes: Map<string, EpisodeView>;
  challenges: Map<string, ChallengeView>;
  skills: SkillInfo[];
};

const publicFileExists = (p: string) => existsSync(join(process.cwd(), "public", p));

export const resolveVideoId = (youtubeId: string) => (youtubeId === "DEMO" ? DEMO_YOUTUBE_ID : youtubeId);

export const resolveThumbnail = (e: Pick<Episode, "thumbnail" | "youtubeId">) =>
  e.thumbnail ?? `https://i.ytimg.com/vi/${resolveVideoId(e.youtubeId)}/hqdefault.jpg`;

/** Drop audio paths whose files aren't recorded yet so the app never requests them. */
function withRecordedAudio(q: Question, missing: Set<string>): Question {
  if (!q.promptAudio) return q;
  const kept = Object.fromEntries(Object.entries(q.promptAudio).filter(([, src]) => src && !missing.has(src)));
  return { ...q, promptAudio: Object.keys(kept).length ? kept : undefined };
}

function build(content: Content, missingAudio: Set<string>): Loaded {
  const episodes = new Map<string, EpisodeView>();
  const challenges = new Map<string, ChallengeView>();
  const skillIds: string[] = [];

  const seasons = [...content.seasons]
    .sort((a, b) => a.order - b.order)
    .map((season): SeasonCard => {
      let sinceLastChallenge: string[] = [];
      let challengeNumber = 0;
      const items = season.items.map((item): ItemCard => {
        if (item.type === "episode") {
          const e = item.episode;
          sinceLastChallenge.push(e.id);
          const card = {
            type: "episode" as const,
            id: e.id,
            number: e.number,
            title: e.title,
            thumbnail: resolveThumbnail(e),
            durationSec: e.durationSec,
            seasonSlug: season.slug,
          };
          episodes.set(e.id, {
            ...card,
            videoId: resolveVideoId(e.youtubeId),
            skills: e.skills,
            homeActivity: e.homeActivity,
            pausePoints: (e.pausePoints ?? [])
              .map((p) => ({ atSec: p.atSec, question: withRecordedAudio(p.question, missingAudio) }))
              .sort((a, b) => a.atSec - b.atSec),
          });
          return card;
        }
        const c = item.challenge;
        challengeNumber += 1;
        const card = {
          type: "challenge" as const,
          id: c.id,
          number: challengeNumber,
          title: c.title,
          sticker: c.sticker,
          seasonSlug: season.slug,
          requires: sinceLastChallenge,
        };
        sinceLastChallenge = [];
        for (const q of c.questions) if (!skillIds.includes(q.skill)) skillIds.push(q.skill);
        challenges.set(c.id, { ...card, questions: c.questions.map((q) => withRecordedAudio(q, missingAudio)) });
        return card;
      });
      return {
        id: season.id,
        slug: season.slug,
        order: season.order,
        title: season.title,
        color: season.color,
        posterImage: season.posterImage,
        status: season.status,
        // Coming-soon seasons show only their poster.
        items: season.status === "published" ? items : [],
      };
    });

  const skills = skillIds.map((id) => ({ id, label: content.skills[id] ?? { rw: id, en: id } }));
  return { seasons, episodes, challenges, skills };
}

let cache: Loaded | undefined;
function load(): Loaded {
  if (cache) return cache;
  const result = validateContent(raw, publicFileExists);
  if (!result.ok) {
    throw new Error(
      `content/seasons.json has problems:\n${result.errors.map((e, i) => `  ${i + 1}. ${e}`).join("\n")}`,
    );
  }
  cache = build(result.content, new Set(result.missingAudio));
  return cache;
}

export const getSeasons = (): SeasonCard[] => load().seasons;

let siteCache: { featured: string[]; contact: { link: string; label: string } | null } | undefined;
/** Settings from content/site.json (edited in the admin dashboard). */
export function getSite() {
  if (siteCache) return siteCache;
  const result = validateContent(raw, publicFileExists);
  if (!result.ok) throw new Error("content/seasons.json has problems (run npm run validate)");
  const site = validateSite(rawSite, result.content);
  if (!site.ok) throw new Error(`content/site.json has problems:\n${site.errors.map((e) => `  - ${e}`).join("\n")}`);
  siteCache = { featured: site.site.featured, contact: whatsappContact(site.site.contact.whatsapp) };
  return siteCache;
}

/** Story cards for the Home slider, in the order chosen in the admin dashboard. */
export const getFeatured = (): EpisodeCardOf[] =>
  getSite().featured.flatMap((id) => {
    const found = getEpisode(id);
    if (!found) return [];
    const card = found.season.items.find((i) => i.id === id);
    return card && card.type === "episode" ? [{ card, season: found.season }] : [];
  });

export const getPublishedSeasons = (): SeasonCard[] => load().seasons.filter((s) => s.status === "published");

export const getSeason = (slug: string): SeasonCard | undefined => load().seasons.find((s) => s.slug === slug);

function seasonOf(slug: string): SeasonCard {
  const season = getSeason(slug);
  if (!season) throw new Error(`Unknown season ${slug}`);
  return season;
}

export function getEpisode(id: string): { episode: EpisodeView; season: SeasonCard } | undefined {
  const episode = load().episodes.get(id);
  return episode && { episode, season: seasonOf(episode.seasonSlug) };
}

export function getChallenge(id: string): { challenge: ChallengeView; season: SeasonCard } | undefined {
  const challenge = load().challenges.get(id);
  return challenge && { challenge, season: seasonOf(challenge.seasonSlug) };
}

export const getEpisodeIds = (): string[] =>
  getPublishedSeasons().flatMap((s) => s.items.filter((i) => i.type === "episode").map((i) => i.id));

export const getChallengeIds = (): string[] =>
  getPublishedSeasons().flatMap((s) => s.items.filter((i) => i.type === "challenge").map((i) => i.id));

/** Skills practised in challenges, in learning order. */
export const getSkills = (): SkillInfo[] => load().skills;

export const getStickerSlots = (): StickerSlot[] =>
  getPublishedSeasons().flatMap((s) =>
    s.items.flatMap((i) =>
      i.type === "challenge" ? [{ challengeId: i.id, sticker: i.sticker, title: i.title, seasonColor: s.color }] : [],
    ),
  );
