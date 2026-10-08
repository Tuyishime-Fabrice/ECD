"use client";

import clsx from "clsx";
import { Lock, Star } from "lucide-react";
import Link from "next/link";
import type { ItemCard as Item, SeasonColor } from "@/content/types";
import type { ItemStatus } from "@/lib/recommend";
import { playLocked, playPop } from "@/lib/sounds";
import { usePick, useT } from "@/lib/store";
import { seasonTheme } from "@/lib/theme";
import { NumberBadge, ProgressBar, StarRow, WatchedBadge } from "./Badges";
import { useOneShot } from "./useWiggle";

export const itemHref = (item: Item) => (item.type === "episode" ? `/watch/${item.id}` : `/challenge/${item.id}`);

/** 16:9 picture for an item: the episode thumbnail, or a sun-yellow star panel for a challenge. */
export function ItemThumb({
  item,
  status,
  color,
  eager = false,
  compact = false,
  className,
}: {
  item: Item;
  status?: ItemStatus;
  color: SeasonColor;
  eager?: boolean;
  /** Smaller badges for small thumbnails. */
  compact?: boolean;
  className?: string;
}) {
  const theme = seasonTheme[color];
  if (item.type === "episode") {
    const s = status?.type === "episode" ? status : undefined;
    return (
      <div className={clsx("relative aspect-video overflow-hidden bg-sky-100", className)}>
        <img
          src={item.thumbnail}
          alt=""
          width={320}
          height={180}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          className="size-full object-cover"
        />
        <NumberBadge
          n={item.number}
          borderClass={theme.border}
          compact={compact}
          className={compact ? "absolute left-1.5 top-1.5" : "absolute left-2 top-2"}
        />
        {s?.watched && (
          <WatchedBadge compact={compact} className={compact ? "absolute right-1.5 top-1.5" : "absolute right-2 top-2"} />
        )}
        {s && !s.watched && s.percent > 0 && <ProgressBar percent={s.percent} className="absolute inset-x-2 bottom-2" />}
      </div>
    );
  }
  const s = status?.type === "challenge" ? status : undefined;
  return (
    <div className={clsx("relative grid aspect-video place-items-center overflow-hidden bg-sun-400", className)}>
      <svg className="absolute inset-0 size-full" viewBox="0 0 160 90" aria-hidden>
        <circle cx="22" cy="20" r="5" fill="#fff" opacity=".7" />
        <circle cx="140" cy="68" r="7" fill="#fff" opacity=".6" />
        <circle cx="132" cy="18" r="3.5" fill="#fff" opacity=".8" />
        <circle cx="30" cy="72" r="3" fill="#fff" opacity=".8" />
      </svg>
      <Star
        className={clsx("relative size-[46%] fill-white text-ink-900", s?.locked && "opacity-45")}
        strokeWidth={2.5}
        aria-hidden
      />
      {s?.locked && (
        <span className="absolute grid size-14 place-items-center rounded-full bg-white shadow-tactile">
          <Lock className="size-8 text-ink-900" strokeWidth={2.5} aria-hidden />
        </span>
      )}
      {s?.done && (
        <span className="absolute bottom-2 rounded-full bg-white/90 px-2 py-1">
          <StarRow stars={s.stars} size="size-5" />
        </span>
      )}
    </div>
  );
}

type Props = {
  item: Item;
  status: ItemStatus;
  color: SeasonColor;
  layout: "row" | "list";
  highlight?: boolean;
  eager?: boolean;
};

export function ItemCardView({ item, status, color, layout, highlight, eager }: Props) {
  const t = useT();
  const pick = usePick();
  const wiggle = useOneShot("animate-wiggle");
  const locked = status.type === "challenge" && status.locked;

  const heading = item.type === "episode" ? t("episodeN", { n: item.number }) : t("challengeN", { n: item.number });
  const title = item.type === "episode" ? pick(item.title) : t("challenge");
  const stateLabel =
    status.type === "episode"
      ? status.watched
        ? t("watched")
        : ""
      : status.locked
        ? t("locked")
        : status.done
          ? t("starsN", { n: status.stars })
          : "";

  const className = clsx(
    "tactile relative block overflow-hidden rounded-card text-left",
    item.type === "challenge" ? "bg-sun-400" : "bg-white",
    layout === "row" ? "w-[min(64vw,260px)]" : "flex w-full items-center gap-3 p-2",
    highlight && "ring-4 ring-sun-400 ring-offset-2 ring-offset-cream-50 motion-safe:animate-pulse-next",
    wiggle.className,
  );

  const content = (
    <>
      <ItemThumb
        item={item}
        status={status}
        color={color}
        eager={eager}
        compact={layout === "list"}
        className={layout === "row" ? "" : "w-36 shrink-0 rounded-2xl sm:w-48"}
      />
      <span className={clsx("block", layout === "row" ? "px-3 py-2" : "min-w-0 flex-1 pr-2")}>
        {layout === "list" && item.type === "episode" ? (
          <span className="block text-base font-semibold text-ink-600">{heading}</span>
        ) : (
          item.type === "episode" && <span className="sr-only">{heading}, </span>
        )}
        <span className="line-clamp-2 block font-display text-xl font-bold leading-snug text-ink-900">
          {item.type === "episode" ? title : heading}
        </span>
        {stateLabel && <span className="sr-only">, {stateLabel}</span>}
      </span>
    </>
  );

  if (locked) {
    return (
      <button
        type="button"
        aria-disabled="true"
        className={className}
        onClick={() => {
          playLocked();
          wiggle.trigger();
        }}
        {...wiggle.props}
      >
        {content}
      </button>
    );
  }
  return (
    <Link href={itemHref(item)} prefetch={false} className={className} onClick={playPop}>
      {content}
    </Link>
  );
}
