"use client";

import { Map as MapIcon } from "lucide-react";
import Link from "next/link";
import type { SeasonCard } from "@/content/types";
import { nextRecommended } from "@/lib/recommend";
import { playPop } from "@/lib/sounds";
import { useHydrated, useLearningState, usePick, useT } from "@/lib/store";
import { Mascot } from "../Mascot";
import { Scene } from "../kid/Scene";

/** Wide mid-page banner inviting the child onto the path of the collection they're in. */
export function FeaturedBanner({ seasons }: { seasons: SeasonCard[] }) {
  const t = useT();
  const pick = usePick();
  const hydrated = useHydrated();
  const learning = useLearningState();
  const published = seasons.filter((s) => s.status === "published");
  const next = hydrated ? nextRecommended(seasons, learning) : null;
  const season = published.find((s) => s.slug === next?.seasonSlug) ?? published[0];
  if (!season) return null;

  return (
    <section className="mt-4 px-4 md:px-8">
      <Link
        href={`/season/${season.slug}`}
        onClick={playPop}
        aria-label={`${t("openPath")}: ${pick(season.title)}`}
        className="tap relative flex min-h-56 overflow-hidden rounded-hero bg-gradient-to-b from-sky-top to-sky-bottom shadow-e2 md:min-h-72"
      >
        <Scene
          name="map-wide"
          className="absolute inset-0"
          imgClassName="size-full object-cover object-[50%_75%]"
        />
        <span aria-hidden className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-paper/95 via-paper/70 to-transparent md:w-2/3" />
        <span className="relative flex max-w-[70%] flex-col justify-center gap-2 p-6 md:max-w-md md:gap-3 md:p-10">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3">{pick(season.title)}</span>
          <span className="font-display text-[28px] font-extrabold leading-[1.05] text-ink md:text-[40px]">
            {t("storyPath")}
          </span>
          <span className="press press-play mt-2 inline-flex h-14 items-center gap-2 self-start rounded-full bg-play px-5 font-display text-lg font-extrabold text-on-accent">
            <MapIcon className="size-6" strokeWidth={2.5} aria-hidden />
            {t("openPath")}
          </span>
        </span>
        <Mascot pose="wave" className="absolute -bottom-3 right-3 w-28 md:right-16 md:w-40" />
      </Link>
    </section>
  );
}
