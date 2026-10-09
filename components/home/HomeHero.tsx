"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight, Gift, Play } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EpisodeCard, ItemCard, SeasonCard } from "@/content/types";
import { hasStarted, nextRecommended } from "@/lib/recommend";
import { playPop } from "@/lib/sounds";
import { useHydrated, useLearningState, usePick, useT } from "@/lib/store";
import { ProgressStrip } from "../kid/marks";

export type FeaturedStory = { card: EpisodeCard; season: SeasonCard };

type Slide = { kind: "continue" | "featured"; item: ItemCard; season: SeasonCard | undefined };

/**
 * The big slider at the top of Home. The first slide is the child's next story
 * ("keep watching") once they have started; the rest are the featured stories
 * chosen in the admin dashboard. It only moves when swiped or tapped.
 */
export function HomeHero({ featured, seasons }: { featured: FeaturedStory[]; seasons: SeasonCard[] }) {
  const t = useT();
  const hydrated = useHydrated();
  const learning = useLearningState();
  const next = hydrated && hasStarted(learning) ? nextRecommended(seasons, learning) : null;

  const slides: Slide[] = [
    ...(next ? [{ kind: "continue" as const, item: next, season: seasons.find((s) => s.slug === next.seasonSlug) }] : []),
    ...featured
      .filter((f) => f.card.id !== next?.id)
      .map((f) => ({ kind: "featured" as const, item: f.card as ItemCard, season: f.season })),
  ];

  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  const onScroll = useCallback(() => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    const step = first.offsetWidth + parseFloat(getComputedStyle(el).columnGap || "0");
    setActive(Math.max(0, Math.min(slides.length - 1, Math.round(el.scrollLeft / step))));
  }, [slides.length]);

  const go = (index: number) => {
    const el = track.current;
    const target = el?.children[index] as HTMLElement | undefined;
    if (!el || !target) return;
    el.scrollTo({ left: target.offsetLeft - el.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft), behavior: "smooth" });
  };

  // A "keep watching" slide appears after hydration: start again from the first slide.
  const firstId = slides[0]?.item.id;
  useEffect(() => {
    track.current?.scrollTo({ left: 0 });
  }, [firstId]);

  if (!slides.length) return null;

  return (
    <section aria-roledescription="carousel" aria-label={t("featured")} className="relative">
      <ul
        ref={track}
        onScroll={onScroll}
        className="scrollbar-touch-hidden flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 pt-1 md:scroll-px-8 md:px-8"
      >
        {slides.map((slide, i) => (
          <HeroSlide key={`${slide.kind}-${slide.item.id}`} slide={slide} index={i} count={slides.length} eager={i === 0} />
        ))}
      </ul>

      {slides.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1">
          {slides.map((s, i) => (
            <button
              key={s.item.id}
              type="button"
              onClick={() => go(i)}
              aria-label={t("goToSlide", { n: i + 1 })}
              aria-current={i === active ? "true" : undefined}
              className="grid size-7 place-items-center rounded-full"
            >
              <span
                className={clsx(
                  "block h-2.5 rounded-full transition-[width,background-color] duration-200",
                  i === active ? "w-7 bg-sun" : "w-2.5 bg-paper shadow-e1",
                )}
              />
            </button>
          ))}
        </div>
      )}

      {slides.length > 1 && (
        <>
          <ArrowButton side="left" label={t("prevSlide")} disabled={active === 0} onClick={() => go(active - 1)} />
          <ArrowButton
            side="right"
            label={t("nextSlide")}
            disabled={active === slides.length - 1}
            onClick={() => go(active + 1)}
          />
        </>
      )}
    </section>
  );
}

function ArrowButton({
  side,
  label,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "tap absolute top-[42%] z-10 hidden size-14 -translate-y-1/2 place-items-center rounded-full bg-paper text-ink shadow-e2 transition-opacity disabled:pointer-events-none disabled:opacity-0 md:grid",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-8" strokeWidth={3} aria-hidden />
    </button>
  );
}

function HeroSlide({ slide, index, count, eager }: { slide: Slide; index: number; count: number; eager: boolean }) {
  const t = useT();
  const pick = usePick();
  const learning = useLearningState();
  const { item, season } = slide;
  const isStory = item.type === "episode";
  const title = isStory ? pick(item.title) : t("challengeN", { n: item.number });
  const percent = isStory ? (learning.episodes[item.id]?.percent ?? 0) : 0;
  const label = slide.kind === "continue" ? t("keepWatching") : season ? pick(season.title) : "";
  const href = isStory ? `/watch/${item.id}` : `/challenge/${item.id}`;

  return (
    <li
      aria-roledescription="slide"
      aria-label={`${index + 1} / ${count}`}
      className="w-[88%] shrink-0 snap-start md:w-full"
    >
      <Link
        href={href}
        prefetch={false}
        onClick={playPop}
        aria-label={`${t("watch")}: ${title}`}
        className="tap group relative flex h-full flex-col overflow-hidden rounded-hero bg-paper shadow-e2 shadow-rim md:block md:aspect-[21/9] md:bg-transparent"
      >
        {/* Picture: on phones a 16:9 panel above the words; on wide screens it fills the slide. */}
        <span className="relative block aspect-video overflow-hidden md:absolute md:inset-0 md:aspect-auto">
          {isStory ? (
            <img
              src={item.thumbnail}
              alt=""
              width={960}
              height={540}
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              decoding="async"
              className="size-full object-cover md:object-[50%_30%]"
            />
          ) : (
            <span className="grid size-full place-items-center bg-berry-soft">
              <img src="/images/ui/gift.svg" alt="" width={240} height={240} className="h-3/4 w-auto" />
            </span>
          )}
          <span aria-hidden className="absolute inset-0 hidden bg-gradient-to-t from-black/75 via-black/25 to-transparent md:block" />
        </span>

        <span className="relative flex flex-1 flex-col gap-1.5 px-5 pb-5 pt-4 pr-28 md:absolute md:inset-x-0 md:bottom-0 md:gap-3 md:p-10 md:pr-48">
          {label && (
            <span
              className={clsx(
                "self-start rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-[0.08em]",
                slide.kind === "continue" ? "bg-sun text-sun-ink" : "bg-paper-2 text-ink-2 md:bg-paper/90",
              )}
            >
              {label}
            </span>
          )}
          <span className="line-clamp-2 font-display text-[26px] font-extrabold leading-[1.05] text-ink md:text-[46px] md:text-white">
            {title}
          </span>
          {slide.kind === "continue" && isStory && percent > 0 && (
            <ProgressStrip percent={percent} className="mt-1 max-w-64 md:max-w-80 md:bg-white/30" />
          )}
        </span>

        <span
          aria-hidden
          className="press press-play absolute bottom-5 right-5 grid size-20 place-items-center rounded-full bg-play md:bottom-10 md:right-10 md:size-28"
        >
          {isStory ? (
            <Play className="ml-1 size-10 fill-on-accent text-on-accent md:size-14" strokeWidth={2.5} />
          ) : (
            <Gift className="size-10 text-on-accent md:size-14" strokeWidth={2.5} />
          )}
        </span>
      </Link>
    </li>
  );
}
