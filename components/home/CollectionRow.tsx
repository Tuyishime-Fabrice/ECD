"use client";

import { Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { SeasonCard } from "@/content/types";
import { itemStatus, nextRecommended } from "@/lib/recommend";
import { playPop } from "@/lib/sounds";
import { useHydrated, useLearningState, usePick, useT } from "@/lib/store";
import { ChallengeCard, StoryCard } from "../kid/StoryCard";

/** One published collection: header with a "Path" button, then a swipeable row of its stories. */
export function CollectionRow({
  season,
  allSeasons,
  eager = false,
}: {
  season: SeasonCard;
  allSeasons: SeasonCard[];
  eager?: boolean;
}) {
  const t = useT();
  const pick = usePick();
  const hydrated = useHydrated();
  const learning = useLearningState();
  const next = hydrated ? nextRecommended(allSeasons, learning) : null;
  const stories = season.items.filter((i) => i.type === "episode");
  const watched = stories.filter((s) => learning.episodes[s.id]?.watched).length;

  // Open the row where the child is: the card before "up next" sits at the left edge.
  const row = useRef<HTMLUListElement>(null);
  const upNextId = next?.seasonSlug === season.slug ? next.id : null;
  useEffect(() => {
    const el = row.current;
    if (!el || !upNextId) return;
    const cards = [...el.children] as HTMLElement[];
    const i = cards.findIndex((c) => c.dataset.id === upNextId);
    const anchor = cards[Math.max(0, i - 1)];
    if (i > 0 && anchor) el.scrollTo({ left: anchor.offsetLeft - el.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft) });
  }, [upNextId]);

  return (
    <section aria-labelledby={`collection-${season.id}`} className="mt-8 first:mt-6">
      <div className="flex items-center gap-3 px-4 md:px-8">
        <img
          src={season.posterImage}
          alt=""
          width={56}
          height={56}
          className="size-14 shrink-0 rounded-full border-[3px] border-paper bg-paper object-cover shadow-e1"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3">
            {t("storiesProgress", { n: watched, m: stories.length })}
          </p>
          <h2 id={`collection-${season.id}`} className="truncate font-display text-[22px] font-extrabold leading-tight text-ink md:text-[26px]">
            {pick(season.title)}
          </h2>
        </div>
        <Link
          href={`/season/${season.slug}`}
          onClick={playPop}
          className="press press-paper flex h-16 shrink-0 items-center gap-2 rounded-full bg-paper px-5 font-display text-[17px] font-extrabold text-ink"
        >
          <MapIcon className="size-6 text-play" strokeWidth={2.5} aria-hidden />
          {t("path")}
        </Link>
      </div>

      <ul
        ref={row}
        className="scrollbar-touch-hidden mt-3 flex snap-x snap-proximity gap-4 overflow-x-auto scroll-px-4 px-4 pb-6 pt-3 md:scroll-px-8 md:px-8"
      >
        {season.items.map((item, i) => {
          const status = itemStatus(item, learning);
          const upNext = item.id === upNextId;
          return (
            <li key={item.id} data-id={item.id} className="flex snap-start">
              {item.type === "episode" && status.type === "episode" ? (
                <StoryCard story={item} status={status} upNext={upNext} eager={eager && i < 2} />
              ) : item.type === "challenge" && status.type === "challenge" ? (
                <ChallengeCard challenge={item} status={status} upNext={upNext} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
