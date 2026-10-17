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

  // The "keep watching" slide is known only after hydration. It takes the first place and the
  // number of slides stays the same, so nothing on the page moves when it appears.
  const slides: Slide[] = [
    ...(next ? [{ kind: "continue" as const, item: next, season: seasons.find((s) => s.slug === next.seasonSlug) }] : []),
    ...featured
      .filter((f) => f.card.id !== next?.id)
      .map((f) => ({ kind: "featured" as const, item: f.card as ItemCard, season: f.season })),
  ].slice(0, Math.max(featured.length, 1));

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
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({
      left: target.offsetLeft - el.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft),
      behavior: reduced ? "auto" : "smooth",
    });
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
        className="scrollbar-touch-hidden flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 pt-1 md:gap-8 md:scroll-px-8 md:px-8"
      >
        {slides.map((slide, i) => (
          // Keyed by position: when "keep watching" arrives, the slides update in place.
          <HeroSlide key={i} slide={slide} index={i} count={slides.length} eager={i === 0} />
        ))}
      </ul>

      {/* Dots (and, with a mouse, arrows) under the slider: never on top of the pictures. */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center px-4 md:justify-between md:px-8">
          <div className="flex items-center md:-ml-2">
            {slides.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={t("goToSlide", { n: i + 1 })}
                aria-current={i === active ? "true" : undefined}
                className="grid h-12 w-8 place-items-center rounded-full"
              >
                <span
                  className={clsx(
                    "block h-2 rounded-full transition-[width,background-color] duration-200",
                    i === active ? "w-6 bg-sun" : "w-2 bg-ink-3/35",
                  )}
                />
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <ArrowButton side="left" label={t("prevSlide")} disabled={active === 0} onClick={() => go(active - 1)} />
            <ArrowButton
              side="right"
              label={t("nextSlide")}
              disabled={active === slides.length - 1}
              onClick={() => go(active + 1)}
            />
          </div>
        </div>
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
      className="tap grid size-12 place-items-center rounded-full border border-line bg-paper text-ink shadow-e1 transition-opacity disabled:cursor-default disabled:opacity-40 disabled:shadow-none"
    >
      <Icon className="size-6" strokeWidth={2.75} aria-hidden />
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
  const action = isStory ? t("watch") : t("letsPlay");
  const meta = [isStory ? t("episodeN", { n: item.number }) : t("challenge"), slide.kind === "continue" && season ? pick(season.title) : ""]
    .filter(Boolean)
    .join(" · ");
  const Icon = isStory ? Play : Gift;

  return (
    <li
      aria-roledescription="slide"
      aria-label={`${index + 1} / ${count}`}
      className="flex w-[88%] shrink-0 snap-start md:w-full"
    >
      <Link
        href={href}
        prefetch={false}
        onClick={playPop}
        aria-label={`${action}: ${title}`}
        className="tap relative flex w-full flex-col overflow-hidden rounded-hero border border-line bg-paper shadow-e2 md:grid md:min-h-[340px] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:min-h-[400px] short:min-h-0"
      >
        {/* Picture: on phones a 16:9 panel above the words; on wide screens it fills the right-hand column. */}
        <span className="relative block aspect-video overflow-hidden bg-paper-2 md:order-last md:aspect-auto">
          {isStory ? (
            <img
              src={item.thumbnail}
              alt=""
              width={960}
              height={540}
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              decoding="async"
              className="size-full object-cover md:absolute md:inset-0"
            />
          ) : (
            <span className="grid size-full place-items-center bg-brand-soft md:absolute md:inset-0">
              <img src="/images/ui/gift.svg" alt="" width={240} height={240} className="h-3/4 w-auto" />
            </span>
          )}
          {/* A soft edge between the words and the picture on wide screens. */}
          <span aria-hidden className="absolute inset-y-0 left-0 hidden w-16 bg-gradient-to-r from-paper to-transparent md:block" />
        </span>

        <span className="relative flex flex-1 flex-col gap-2 px-5 pb-5 pr-24 pt-4 md:justify-center md:gap-3 md:py-8 md:pl-10 md:pr-6 lg:pl-12">
          {label && (
            <span
              className={clsx(
                "eyebrow max-w-full self-start truncate rounded-full px-3 py-1",
                slide.kind === "continue" ? "bg-sun text-sun-ink" : "bg-brand-soft text-brand",
              )}
            >
              {label}
            </span>
          )}
          {/* Every slide keeps room for two lines and a progress bar, so all have the same height. */}
          <span className="line-clamp-2 min-h-[2.2em] font-display text-[22px] font-black leading-[1.1] tracking-[-0.01em] text-ink min-[400px]:text-[24px] md:line-clamp-3 md:min-h-0 md:text-[34px] lg:text-[44px]">
            {title}
          </span>
          <span className="hidden truncate text-base font-bold text-ink-2 md:block">{meta}</span>
          <ProgressStrip
            percent={percent}
            className={clsx("mt-1 max-w-64", !(slide.kind === "continue" && isStory && percent > 0) && "invisible")}
          />
          {/* Wide screens: a clear call to action in the words column. */}
          <span
            aria-hidden
            className="press press-play mt-2 hidden h-16 items-center gap-3 self-start rounded-full bg-play pl-5 pr-7 font-display text-xl font-black text-on-accent md:inline-flex"
          >
            <Icon className={clsx("size-7", isStory && "fill-on-accent")} strokeWidth={2.5} />
            {action}
          </span>
        </span>

        {/* Phones: the coral play disc in the corner of the card. */}
        <span
          aria-hidden
          className="press press-play absolute bottom-5 right-4 grid size-16 place-items-center rounded-full bg-play min-[400px]:right-5 min-[400px]:size-[72px] md:hidden"
        >
          <Icon className={clsx("size-8 text-on-accent", isStory && "ml-1 fill-on-accent")} strokeWidth={2.5} />
        </span>
      </Link>
    </li>
  );
}
