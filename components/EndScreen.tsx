"use client";

import { ChevronRight, House, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import type { ItemCard, LocalizedText } from "@/content/types";
import { playCheer, playPop } from "@/lib/sounds";
import { usePick, useT } from "@/lib/store";
import { itemHref } from "./kid/StoryCard";
import { Mascot } from "./Mascot";
import { StarBurst } from "./StarBurst";

export function HomeActivityCard({ text }: { text: LocalizedText }) {
  const t = useT();
  const pick = usePick();
  return (
    <div className="flex gap-4 rounded-card bg-paper p-4 text-left shadow-e2 shadow-rim sm:p-5">
      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-leaf-soft">
        <House className="size-8 text-leaf-ink" strokeWidth={2.5} aria-hidden />
      </span>
      <div>
        <h3 className="font-display text-2xl font-bold text-leaf-ink">{t("doItAtHome")}</h3>
        <p className="mt-1 text-lg leading-relaxed text-ink">{pick(text)}</p>
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

  const round = "press press-paper grid size-16 shrink-0 place-items-center rounded-full bg-paper text-ink";

  return (
    <section className="mx-auto w-full max-w-2xl animate-fade-in px-4 pb-6">
      <div className="relative flex items-center justify-center gap-3 py-2">
        <StarBurst />
        <Mascot pose="cheer" className="w-24 short:w-16" />
        <h2 className="font-display text-[36px] font-extrabold text-ink">{t("wellDone")}</h2>
      </div>

      <HomeActivityCard text={homeActivity} />

      {next && (
        <Link
          href={itemHref(next)}
          onClick={playPop}
          aria-label={`${t("next")}: ${next.type === "episode" ? pick(next.title) : t("challenge")}`}
          className="press press-play mt-6 flex min-h-24 items-center gap-4 rounded-full bg-play py-2 pl-2 pr-5 text-on-accent"
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
            <span className="grid aspect-video w-32 shrink-0 place-items-center rounded-full bg-berry-soft">
              <img src="/images/ui/gift.svg" alt="" width={56} height={56} className="h-[80%] w-auto" />
            </span>
          )}
          <span className="min-w-0 flex-1 font-display text-[26px] font-bold leading-tight">
            {next.type === "challenge" ? t("challenge") : t("nextEpisode")}
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
