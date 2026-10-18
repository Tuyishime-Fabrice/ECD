"use client";

import clsx from "clsx";
import { Moon } from "lucide-react";
import type { SeasonCard } from "@/content/types";
import { playLocked } from "@/lib/sounds";
import { usePick, useT } from "@/lib/store";
import { cardBody, cardClass, cardPicture, cardTitle } from "../kid/StoryCard";
import { useOneShot } from "../useWiggle";

/** Collections that aren't ready yet: sleeping posters that wiggle when tapped. */
export function ComingSoonRow({ seasons }: { seasons: SeasonCard[] }) {
  const t = useT();
  if (!seasons.length) return null;
  return (
    <section aria-labelledby="coming-soon" className="mt-8 md:mt-12">
      <h2 id="coming-soon" className="flex items-center gap-2.5 px-4 font-display text-[22px] font-black leading-tight text-ink md:px-8 md:text-[28px]">
        <Moon className="size-6 fill-brand-soft text-brand" strokeWidth={2.5} aria-hidden />
        {t("comingSoonHeading")}
      </h2>
      <ul className="scrollbar-touch-hidden mt-2 flex gap-3 overflow-x-auto px-4 pb-5 pt-2 md:gap-5 md:px-8">
        {seasons.map((s) => (
          <li key={s.id} className="flex">
            <SleepingCollection season={s} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SleepingCollection({ season }: { season: SeasonCard }) {
  const t = useT();
  const pick = usePick();
  const wiggle = useOneShot("animate-wiggle");
  const title = pick(season.title);
  return (
    <button
      type="button"
      aria-disabled="true"
      aria-label={t("comingSoon", { title })}
      onClick={() => {
        playLocked();
        wiggle.trigger();
      }}
      {...wiggle.props}
      className={clsx(cardClass, wiggle.className)}
    >
      <span className={clsx(cardPicture, "bg-brand-soft")}>
        <img src={season.posterImage} alt="" width={320} height={180} loading="lazy" className="size-full object-cover opacity-70 saturate-[0.7]" />
        <span
          aria-hidden
          className="absolute right-2 top-2 rounded-full border border-line bg-paper px-2.5 py-0.5 font-display text-sm font-black text-brand"
        >
          z z
        </span>
      </span>
      <span className={cardBody}>
        <span className="eyebrow block text-brand">{t("soon")}</span>
        <span className={cardTitle}>{title}</span>
      </span>
    </button>
  );
}
