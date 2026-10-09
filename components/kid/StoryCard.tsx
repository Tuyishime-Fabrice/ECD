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

const card =
  "tap relative flex w-[min(62vw,240px)] shrink-0 flex-col rounded-card bg-paper p-1.5 text-left shadow-e1 shadow-rim md:w-64";
/** The story to watch next: a sun ring and a soft halo. */
const upNextRing = "ring-4 ring-sun outline-8 outline-sun/25";

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
      className={clsx(card, upNext && upNextRing, className)}
    >
      <span className="relative block aspect-video overflow-hidden rounded-[18px] bg-paper-2">
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
      </span>
      {inProgress && <ProgressStrip percent={status.percent} className="mx-1.5 mt-2" />}
      <span className="block px-2 pb-2 pt-2">
        <span
          className={clsx(
            "block text-[11px] font-extrabold uppercase leading-4 tracking-[0.08em]",
            upNext ? "text-play-ink" : "text-ink-3",
          )}
        >
          {upNext ? t("upNext") : t("episodeN", { n: story.number })}
        </span>
        <span className="mt-0.5 line-clamp-2 block min-h-[2.5em] font-display text-[17px] font-bold leading-[1.25] text-ink">
          {pick(story.title)}
        </span>
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
      <span className="relative grid aspect-video place-items-center overflow-hidden rounded-[18px] bg-berry-soft">
        <img
          src={status.done ? "/images/ui/gift-open.svg" : "/images/ui/gift.svg"}
          alt=""
          width={120}
          height={120}
          loading="lazy"
          decoding="async"
          className={clsx("h-[78%] w-auto", status.locked && "opacity-80")}
        />
        {status.locked && <LockMark className="absolute right-2 top-2" />}
        {status.done && <WatchedMark className="absolute right-2 top-2" />}
        <span className="absolute inset-x-0 bottom-2 flex justify-center">
          {status.done ? (
            <StarMarks stars={status.stars} className="rounded-full bg-paper px-2 py-1 shadow-e1" />
          ) : (
            <Pips done={watched} total={challenge.requires.length} className="rounded-full bg-paper px-2.5 py-1.5 shadow-e1" />
          )}
        </span>
      </span>
      <span className="block px-2 pb-2 pt-2">
        <span
          className={clsx(
            "block text-[11px] font-extrabold uppercase leading-4 tracking-[0.08em]",
            upNext ? "text-play-ink" : "text-berry-ink",
          )}
        >
          {upNext ? t("upNext") : t("challenge")}
        </span>
        <span className="mt-0.5 line-clamp-2 block min-h-[2.5em] font-display text-[17px] font-bold leading-[1.25] text-ink">
          {t("challengeN", { n: challenge.number })}
        </span>
        {status.locked && <span className="sr-only">, {t("locked")}</span>}
      </span>
    </>
  );

  const className_ = clsx(card, "bg-paper", upNext && upNextRing, wiggle.className, className);

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
