/**
 * Content shapes handed from the (build-time) loader to client components.
 * Type-only, so importing this never pulls zod into the browser bundle.
 */
import type { LocalizedText, Question, SeasonColor } from "./schema.ts";

export type { LocalizedText, Question, SeasonColor };

export type EpisodeCard = {
  type: "episode";
  id: string;
  number: number;
  title: LocalizedText;
  thumbnail: string;
  durationSec: number;
  seasonSlug: string;
};

export type ChallengeCard = {
  type: "challenge";
  id: string;
  /** 1 for the first challenge in its season, 2 for the second, … */
  number: number;
  title: LocalizedText;
  sticker: string;
  seasonSlug: string;
  /** Episodes that unlock this challenge (those since the previous challenge). */
  requires: string[];
};

export type ItemCard = EpisodeCard | ChallengeCard;

export type SeasonCard = {
  id: string;
  slug: string;
  order: number;
  title: LocalizedText;
  color: SeasonColor;
  posterImage: string;
  status: "published" | "coming_soon";
  items: ItemCard[];
};

export type PausePoint = { atSec: number; question: Question };

export type EpisodeView = EpisodeCard & {
  /** Real YouTube id ("DEMO" already resolved). */
  videoId: string;
  skills: string[];
  homeActivity: LocalizedText;
  pausePoints: PausePoint[];
};

export type ChallengeView = ChallengeCard & { questions: Question[] };

export type SkillInfo = { id: string; label: LocalizedText };

export type StickerSlot = { challengeId: string; sticker: string; title: LocalizedText; seasonColor: SeasonColor };
