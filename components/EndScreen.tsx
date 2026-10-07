"use client";

import { ChevronRight, House, RotateCcw, Star } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import type { ItemCard, LocalizedText } from "@/content/types";
import { playCheer, playPop } from "@/lib/sounds";
import { usePick, useT } from "@/lib/store";
import { itemHref } from "./ItemCard";
import { Mascot } from "./Mascot";
import { StarBurst } from "./StarBurst";

export function HomeActivityCard({ text }: { text: LocalizedText }) {
  const t = useT();
  const pick = usePick();
  return (
    <div className="flex gap-4 rounded-card bg-white p-4 text-left shadow-soft sm:p-5">
      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-leaf-100">
        <House className="size-8 text-leaf-700" strokeWidth={2.5} aria-hidden />
      </span>
      <div>
        <h3 className="font-display text-2xl font-bold text-leaf-700">{t("doItAtHome")}</h3>
        <p className="mt-1 text-lg leading-relaxed text-ink-900">{pick(text)}</p>
      </div>
    </div>
  );
}

type Props = {
  homeActivity: LocalizedText;
  next: ItemCard | null;
  onWatchAgain: () => void;
};

/** Shown in place of the player when the video ends. Nothing plays by itself. */
export function EndScreen({ homeActivity, next, onWatchAgain }: Props) {
  const t = useT();
  const pick = usePick();

  useEffect(() => {
    playCheer();
  }, []);

  const round = "tactile grid size-16 shrink-0 place-items-center rounded-full bg-white text-ink-900";

  return (
    <section className="mx-auto w-full max-w-2xl animate-fade-in px-4 pb-6">
      <div className="relative flex items-center justify-center gap-3 py-2">
        <StarBurst />
        <Mascot pose="cheer" className="w-24 short:w-16" />
        <h2 className="font-display text-[36px] font-extrabold text-ink-900">{t("wellDone")}</h2>
      </div>

      <HomeActivityCard text={homeActivity} />

      {next && (
        <Link
          href={itemHref(next)}
          onClick={playPop}
          aria-label={`${t("next")}: ${next.type === "episode" ? pick(next.title) : t("challenge")}`}
          className="tactile mt-6 flex min-h-24 items-center gap-4 rounded-full bg-sky-700 py-2 pl-2 pr-5 text-white"
        >
          {next.type === "episode" ? (
            <img
              src={next.thumbnail}
              alt=""
              width={320}
              height={180}
              className="aspect-video w-32 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="grid aspect-video w-32 shrink-0 place-items-center rounded-full bg-sun-400">
              <Star className="size-12 fill-white text-ink-900" strokeWidth={2.5} aria-hidden />
            </span>
          )}
          <span className="min-w-0 flex-1 font-display text-[26px] font-bold leading-tight">
            {next.type === "challenge" ? t("challenge") : t("next")}
          </span>
          <ChevronRight className="size-9 shrink-0" strokeWidth={3} aria-hidden />
        </Link>
      )}

      <div className="mt-5 flex items-center justify-center gap-8">
        <button type="button" onClick={onWatchAgain} aria-label={t("watchAgain")} className={round}>
          <RotateCcw className="size-8" strokeWidth={2.5} aria-hidden />
        </button>
        <Link href="/" onClick={playPop} aria-label={t("home")} className={round}>
          <House className="size-8" strokeWidth={2.5} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
