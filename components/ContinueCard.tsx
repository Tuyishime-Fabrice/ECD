"use client";

import { Play } from "lucide-react";
import Link from "next/link";
import type { SeasonCard } from "@/content/types";
import { hasStarted, itemStatus, nextRecommended } from "@/lib/recommend";
import { playPop } from "@/lib/sounds";
import { useLearningState, usePick, useT } from "@/lib/store";
import { itemHref, ItemThumb } from "./ItemCard";

/** Big "Continue" card: shown once the child has started, leads to the next recommended item. */
export function ContinueCard({ seasons }: { seasons: SeasonCard[] }) {
  const t = useT();
  const pick = usePick();
  const state = useLearningState();
  const next = hasStarted(state) ? nextRecommended(seasons, state) : null;
  if (!next) return null;

  const season = seasons.find((s) => s.slug === next.seasonSlug);
  const title = next.type === "episode" ? pick(next.title) : t("challengeN", { n: next.number });

  return (
    <Link
      href={itemHref(next)}
      onClick={playPop}
      aria-label={`${t("continue")}: ${title}`}
      className="tactile relative z-10 mx-4 -mt-6 flex animate-fade-in flex-col overflow-hidden rounded-card bg-white sm:mx-auto sm:max-w-2xl sm:flex-row sm:items-center"
    >
      <div className="relative sm:w-[55%]">
        <ItemThumb item={next} status={itemStatus(next, state)} color={season?.color ?? "sky"} eager />
        <span className="absolute bottom-3 right-3 grid size-20 place-items-center rounded-full border-4 border-white bg-sky-700 shadow-tactile">
          <Play className="ml-1 size-10 fill-white text-white" strokeWidth={2.5} aria-hidden />
        </span>
      </div>
      <div className="p-4 sm:p-6">
        <p className="font-display text-[34px] font-extrabold leading-none text-sky-700">{t("continue")}</p>
        <p className="mt-1 line-clamp-2 text-lg font-semibold text-ink-600">{title}</p>
      </div>
    </Link>
  );
}
