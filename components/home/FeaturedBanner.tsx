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
    <section className="mt-6 px-4 md:mt-10 md:px-8">
      <Link
        href={`/season/${season.slug}`}
        onClick={playPop}
        aria-label={`${t("openPath")}: ${pick(season.title)}`}
        className="tap relative flex min-h-56 overflow-hidden rounded-hero border border-line bg-gradient-to-b from-sky-top to-sky-bottom shadow-e2 md:min-h-72"
      >
        <Scene
          name="map-wide"
          className="absolute inset-0"
          imgClassName="size-full object-cover object-[50%_75%]"
        />
        <span aria-hidden className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-paper via-paper/80 to-transparent md:w-2/3" />
        <span className="relative flex max-w-[80%] flex-col justify-center gap-2 p-5 min-[400px]:p-6 md:max-w-md md:gap-3 md:p-10 lg:p-12">
          <span className="eyebrow text-brand">{pick(season.title)}</span>
          <span className="max-w-[12ch] font-display text-[26px] font-black leading-[1.05] tracking-[-0.01em] text-ink min-[400px]:text-[28px] md:max-w-none md:text-[40px]">
            {t("storyPath")}
          </span>
          <span className="press press-play mt-2 inline-flex h-16 items-center gap-2 self-start whitespace-nowrap rounded-full bg-play pl-4 pr-5 font-display text-[19px] font-black text-on-accent md:pl-5 md:pr-6 md:text-xl">
            <MapIcon className="size-6" strokeWidth={2.5} aria-hidden />
            {t("openPath")}
          </span>
        </span>
        <Mascot pose="wave" className="absolute -bottom-3 right-3 w-28 md:right-16 md:w-40" />
      </Link>
    </section>
  );
}
