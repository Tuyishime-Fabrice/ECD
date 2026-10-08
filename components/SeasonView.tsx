"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import type { SeasonCard } from "@/content/types";
import { itemStatus, nextRecommended } from "@/lib/recommend";
import { useDocumentTitle, useLearningState, usePick, useT } from "@/lib/store";
import { seasonTheme } from "@/lib/theme";
import { ItemCardView } from "./ItemCard";

export function SeasonView({ season, allSeasons }: { season: SeasonCard; allSeasons: SeasonCard[] }) {
  const t = useT();
  const pick = usePick();
  const state = useLearningState();
  const theme = seasonTheme[season.color];
  const next = nextRecommended(allSeasons, state);
  useDocumentTitle(pick(season.title));

  const episodes = season.items.filter((i) => i.type === "episode");
  const watched = episodes.filter((e) => state.episodes[e.id]?.watched).length;

  return (
    <>
      <section className={clsx("mx-4 flex items-center gap-3 overflow-hidden rounded-card p-4 sm:p-6", theme.bg)}>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[34px] font-extrabold leading-tight text-ink-900 sm:text-[40px]">
            {pick(season.title)}
          </h1>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-lg font-bold text-ink-900">
            <Check className="size-5 text-leaf-700" strokeWidth={4} aria-hidden />
            <span aria-hidden>
              {watched}/{episodes.length}
            </span>
            <span className="sr-only">{t("episodesWatched", { n: watched, m: episodes.length })}</span>
          </p>
        </div>
        <img
          src={season.posterImage}
          alt=""
          width={400}
          height={300}
          className="w-32 shrink-0 rounded-2xl border-4 border-white sm:w-56"
        />
      </section>

      <ol className="mx-auto mt-5 flex max-w-2xl flex-col gap-4 px-4">
        {season.items.map((item, i) => (
          <li key={item.id}>
            <ItemCardView
              item={item}
              status={itemStatus(item, state)}
              color={season.color}
              layout="list"
              highlight={item.id === next?.id}
              eager={i < 3}
            />
          </li>
        ))}
      </ol>
    </>
  );
}
