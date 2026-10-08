"use client";

import clsx from "clsx";
import { ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import type { SeasonCard } from "@/content/types";
import { itemStatus } from "@/lib/recommend";
import { playLocked, playPop } from "@/lib/sounds";
import { useLearningState, usePick, useT } from "@/lib/store";
import { seasonTheme } from "@/lib/theme";
import { ItemCardView } from "./ItemCard";
import { useOneShot } from "./useWiggle";

export function SeasonRow({ season, eager = false }: { season: SeasonCard; eager?: boolean }) {
  const pick = usePick();
  const state = useLearningState();
  const theme = seasonTheme[season.color];

  if (season.status === "coming_soon") return <ComingSoonRow season={season} />;

  return (
    <section aria-labelledby={`season-${season.id}`} className="mt-6">
      <h2 id={`season-${season.id}`} className="px-4">
        <Link
          href={`/season/${season.slug}`}
          onClick={playPop}
          className={clsx(
            "tactile inline-flex min-h-16 items-center gap-1 rounded-full py-2 pl-5 pr-3 font-display text-2xl font-extrabold text-ink-900",
            theme.bg,
          )}
        >
          {pick(season.title)}
          <ChevronRight className="size-7" strokeWidth={3} aria-hidden />
        </Link>
      </h2>
      <ul className="scrollbar-touch-hidden relative mt-3 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-5 pt-1">
        {season.items.map((item, i) => (
          <li key={item.id} className="shrink-0 snap-start">
            <ItemCardView
              item={item}
              status={itemStatus(item, state)}
              color={season.color}
              layout="row"
              eager={eager && i < 2}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ComingSoonRow({ season }: { season: SeasonCard }) {
  const t = useT();
  const pick = usePick();
  const wiggle = useOneShot("animate-wiggle");
  const theme = seasonTheme[season.color];
  const title = pick(season.title);
  const nudge = () => {
    playLocked();
    wiggle.trigger();
  };

  return (
    <section aria-labelledby={`season-${season.id}`} className="mt-6">
      <h2 id={`season-${season.id}`} className="flex items-center gap-2 px-4">
        <span
          className={clsx(
            "inline-flex min-h-14 items-center rounded-full px-5 py-2 font-display text-2xl font-extrabold text-ink-900",
            theme.soft,
          )}
        >
          {title}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 font-display text-lg font-bold text-ink-900 shadow-soft">
          <Clock className="size-5" strokeWidth={2.5} aria-hidden />
          {t("soon")}
        </span>
      </h2>
      <div className="scrollbar-touch-hidden mt-3 flex gap-4 overflow-x-auto px-4 pb-5 pt-1">
        <button
          type="button"
          aria-label={t("comingSoon", { title })}
          aria-disabled="true"
          onClick={nudge}
          {...wiggle.props}
          className={clsx(
            "tactile flex shrink-0 gap-4 rounded-card text-left opacity-60 grayscale-[35%]",
            wiggle.className,
          )}
        >
          <span className="block w-[min(64vw,260px)] overflow-hidden rounded-card bg-white p-2">
            <img
              src={season.posterImage}
              alt=""
              width={400}
              height={300}
              loading="lazy"
              decoding="async"
              className="aspect-video w-full rounded-2xl object-cover"
            />
          </span>
          {[0, 1].map((i) => (
            <span key={i} aria-hidden className={clsx("block w-[min(64vw,260px)] rounded-card", theme.soft)} />
          ))}
        </button>
      </div>
    </section>
  );
}
