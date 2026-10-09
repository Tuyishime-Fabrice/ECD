"use client";

import clsx from "clsx";
import { Moon } from "lucide-react";
import type { SeasonCard } from "@/content/types";
import { playLocked } from "@/lib/sounds";
import { usePick, useT } from "@/lib/store";
import { useOneShot } from "../useWiggle";

/** Collections that aren't ready yet: sleeping posters that wiggle when tapped. */
export function ComingSoonRow({ seasons }: { seasons: SeasonCard[] }) {
  const t = useT();
  if (!seasons.length) return null;
  return (
    <section aria-labelledby="coming-soon" className="mt-8">
      <h2 id="coming-soon" className="flex items-center gap-2 px-4 font-display text-xl font-extrabold text-ink-2 md:px-8">
        <Moon className="size-5 fill-berry text-berry" strokeWidth={2.5} aria-hidden />
        {t("comingSoonHeading")}
      </h2>
      <ul className="scrollbar-touch-hidden mt-3 flex gap-4 overflow-x-auto px-4 pb-6 pt-1 md:px-8">
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
      className={clsx(
        "tap relative flex w-[min(62vw,240px)] shrink-0 flex-col rounded-card bg-paper p-1.5 text-left shadow-e1 shadow-rim md:w-64",
        wiggle.className,
      )}
    >
      <span className="relative block aspect-video overflow-hidden rounded-[18px] bg-berry-soft">
        <img src={season.posterImage} alt="" width={320} height={180} loading="lazy" className="size-full object-cover opacity-80" />
        <span
          aria-hidden
          className="absolute right-2 top-2 rounded-full bg-berry-soft px-2.5 py-1 font-display text-sm font-extrabold text-berry-ink shadow-e1"
        >
          z z
        </span>
      </span>
      <span className="block px-2 pb-2 pt-2">
        <span className="block text-[11px] font-extrabold uppercase leading-4 tracking-[0.08em] text-berry-ink">
          {t("soon")}
        </span>
        <span className="mt-0.5 line-clamp-2 block min-h-[2.5em] font-display text-[17px] font-bold leading-[1.25] text-ink-2">
          {title}
        </span>
      </span>
    </button>
  );
}
