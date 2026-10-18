"use client";

import clsx from "clsx";
import Link from "next/link";
import type { ChallengeCard as Challenge, EpisodeCard as Story } from "@/content/types";
import type { ItemStatus } from "@/lib/recommend";
import { playLocked, playPop } from "@/lib/sounds";
import { useLearningState, usePick, useT } from "@/lib/store";
import { useOneShot } from "../useWiggle";
import { LockMark, Pips, PlayDisc, ProgressStrip, StarMarks, WatchedMark } from "./marks";

/** Where tapping an item goes. */
export const itemHref = (item: { type: "episode" | "challenge"; id: string }) =>
  item.type === "episode" ? `/watch/${item.id}` : `/challenge/${item.id}`;

/** White card, hairline border, soft shadow; the picture sits flush at the top. */
export const cardClass =
  "tap relative flex w-[min(62vw,240px)] shrink-0 flex-col overflow-hidden rounded-card border border-line bg-paper text-left shadow-e1 md:w-64";
/** The story to watch next: a mustard ring. */
const upNextRing = "border-sun ring-2 ring-sun";
/** The picture at the top of a card. */
export const cardPicture = "relative block aspect-video overflow-hidden bg-paper-2";
/** The words under the picture. */
export const cardBody = "block px-3 pb-3 pt-2.5";
/** Card titles keep room for two lines, so every card in a row is the same height. */
export const cardTitle = "mt-1 line-clamp-2 block min-h-[2.5em] font-display text-base font-black leading-[1.25] text-ink";

export function StoryCard({
  story,
  status,
  upNext = false,
  eager = false,
  className,
}: {
  story: Story;
  status: Extract<ItemStatus, { type: "episode" }>;
  upNext?: boolean;
  eager?: boolean;
  className?: string;
}) {
  const t = useT();
  const pick = usePick();
  const inProgress = !status.watched && status.percent > 0;

  return (
    <Link
      href={`/watch/${story.id}`}
      prefetch={false}
      onClick={playPop}
      data-up-next={upNext || undefined}
      className={clsx(cardClass, upNext && upNextRing, className)}
    >
      <span className={cardPicture}>
        <img
          src={story.thumbnail}
          alt=""
          width={320}
          height={180}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          className="size-full object-cover"
        />
        {status.watched && <WatchedMark className="absolute right-2 top-2" />}
        {upNext && <PlayDisc className="absolute bottom-2 right-2" />}
        {/* How far the child got, along the picture's bottom edge. */}
        {inProgress && (
          <ProgressStrip percent={status.percent} variant="edge" className="absolute inset-x-0 bottom-0" />
        )}
      </span>
      <span className={cardBody}>
        <span className={clsx("eyebrow block", upNext ? "text-play-ink" : "text-ink-3")}>
          {upNext ? t("upNext") : t("episodeN", { n: story.number })}
        </span>
        <span className={cardTitle}>{pick(story.title)}</span>
        {status.watched && <span className="sr-only">, {t("watched")}</span>}
      </span>
    </Link>
  );
}

export function ChallengeCard({
  challenge,
  status,
  upNext = false,
  className,
}: {
  challenge: Challenge;
  status: Extract<ItemStatus, { type: "challenge" }>;
  upNext?: boolean;
  className?: string;
}) {
  const t = useT();
  const learning = useLearningState();
  const wiggle = useOneShot("animate-wiggle");
  const watched = challenge.requires.filter((id) => learning.episodes[id]?.watched).length;

  const body = (
    <>
      <span className={clsx(cardPicture, "grid place-items-center bg-brand-soft")}>
        <img
          src={status.done ? "/images/ui/gift-open.svg" : "/images/ui/gift.svg"}
          alt=""
          width={120}
          height={120}
          loading="lazy"
          decoding="async"
          className={clsx("h-[70%] w-auto", status.locked && "opacity-80")}
        />
        {status.locked && <LockMark className="absolute right-2 top-2" />}
        {status.done && <WatchedMark className="absolute right-2 top-2" />}
        <span className="absolute inset-x-0 bottom-2 flex justify-center">
          {status.done ? (
            <StarMarks stars={status.stars} className="rounded-full border border-line bg-paper px-2 py-1" />
          ) : (
            <Pips done={watched} total={challenge.requires.length} className="rounded-full border border-line bg-paper px-2.5 py-1.5" />
          )}
        </span>
      </span>
      <span className={cardBody}>
        <span className={clsx("eyebrow block", upNext ? "text-play-ink" : "text-brand")}>
          {upNext ? t("upNext") : t("challenge")}
        </span>
        <span className={cardTitle}>{t("challengeN", { n: challenge.number })}</span>
        {status.locked && <span className="sr-only">, {t("locked")}</span>}
        {status.done && <span className="sr-only">, {t("starsN", { n: status.stars })}</span>}
      </span>
    </>
  );

  const className_ = clsx(cardClass, upNext && upNextRing, wiggle.className, className);

  if (status.locked) {
    return (
      <button
        type="button"
        aria-disabled="true"
        className={className_}
        onClick={() => {
          playLocked();
          wiggle.trigger();
        }}
        {...wiggle.props}
      >
        {body}
      </button>
    );
  }
  return (
    <Link
      href={`/challenge/${challenge.id}`}
      prefetch={false}
      onClick={playPop}
      data-up-next={upNext || undefined}
      className={className_}
    >
      {body}
    </Link>
  );
}
