"use client";

import clsx from "clsx";
import { Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import type { ChallengeCard, EpisodeCard, SeasonCard } from "@/content/types";
import { DESIGN_WIDTH, layoutPath, type PathNode } from "@/lib/path-layout";
import { itemStatus, nextRecommended } from "@/lib/recommend";
import { playLocked, playPop } from "@/lib/sounds";
import { useDocumentTitle, useHydrated, useLearningState, usePick, useT } from "@/lib/store";
import { LockMark, Pips, ProgressStrip, StarMarks, WatchedMark } from "./kid/marks";
import { Scene, Sky } from "./kid/Scene";
import { Mascot } from "./Mascot";
import { useOneShot } from "./useWiggle";

/** A collection as a path map: stones climb a winding road from story 1 to the summit. */
export function SeasonView({ season, allSeasons }: { season: SeasonCard; allSeasons: SeasonCard[] }) {
  const t = useT();
  const pick = usePick();
  const hydrated = useHydrated();
  const learning = useLearningState();
  useDocumentTitle(pick(season.title));

  const next = hydrated ? nextRecommended(allSeasons, learning) : null;
  const currentId = next?.seasonSlug === season.slug ? next.id : null;
  const layout = useMemo(
    () =>
      layoutPath(
        season.items.map((i) => ({
          id: i.id,
          kind: i.type === "episode" ? ("story" as const) : ("challenge" as const),
          current: i.id === currentId,
        })),
      ),
    [season.items, currentId],
  );

  const stories = season.items.filter((i) => i.type === "episode");
  const watched = stories.filter((s) => learning.episodes[s.id]?.watched).length;
  // Everything done: the whole road is walked, in gold.
  const allDone =
    hydrated &&
    !currentId &&
    season.items.every((i) => (i.type === "episode" ? learning.episodes[i.id]?.watched : !!learning.challenges[i.id]));
  const walked = layout.walked || (allDone ? layout.road : "");

  // Open the map where the child is.
  useEffect(() => {
    if (!hydrated) return;
    const target = document.querySelector<HTMLElement>("[data-path-current]");
    if (target) target.scrollIntoView({ block: "center" });
    else window.scrollTo({ top: 0 });
  }, [hydrated, currentId]);

  return (
    // overflow-x-clip: nothing on the map may make the page scroll sideways.
    <div className="relative overflow-x-clip">
      {/* The world behind the map, from under the top bar to the bottom of the page. */}
      <div aria-hidden className="absolute inset-x-0 -top-24 bottom-0 -z-10 overflow-hidden">
        <Sky className="absolute inset-0" />
        <Scene
          name="map"
          wide="map-wide"
          eager
          className="absolute inset-x-0 bottom-0 block h-full"
          imgClassName="size-full object-cover object-bottom"
        />
      </div>

      <header className="relative mx-auto max-w-md px-4 pt-2">
        <div className="rounded-card bg-paper px-5 py-4 shadow-e2 inset-shadow-rim">
          <h1 className="font-display text-[28px] font-extrabold leading-tight text-ink">{pick(season.title)}</h1>
          <p className="mt-1 text-sm font-bold text-ink-2">{t("storiesProgress", { n: watched, m: stories.length })}</p>
          <ProgressStrip percent={stories.length ? (watched / stories.length) * 100 : 0} className="mt-2 h-2.5" />
        </div>
      </header>

      <div className="relative mx-auto w-full max-w-[460px]" style={{ height: layout.height }}>
        <svg
          aria-hidden
          className="absolute inset-0 size-full overflow-visible"
          viewBox={`0 0 ${DESIGN_WIDTH} ${layout.height}`}
          preserveAspectRatio="none"
        >
          <Road d={layout.road} edge="stroke-road-edge" fill="stroke-road" dots="stroke-road-dots" />
          {walked && <Road d={walked} edge="stroke-sun-lip" fill="stroke-sun" dots="stroke-sun-soft" />}
        </svg>

        <ol>
          {layout.nodes.map((node) => {
            const item = season.items.find((i) => i.id === node.id)!;
            return (
              <li
                key={node.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${node.x * 100}%`, top: node.y }}
              >
                {item.type === "episode" ? (
                  <StoryStone story={item} node={node} />
                ) : (
                  <ChallengeStone challenge={item} node={node} />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Road({ d, edge, fill, dots }: { d: string; edge: string; fill: string; dots: string }) {
  const common = { d, fill: "none", strokeLinecap: "round" as const, vectorEffect: "non-scaling-stroke" };
  return (
    <>
      <path {...common} className={edge} strokeWidth={32} />
      <path {...common} className={fill} strokeWidth={24} />
      <path {...common} className={dots} strokeWidth={4} strokeDasharray="0.1 16" />
    </>
  );
}

function StoryStone({ story, node }: { story: EpisodeCard; node: PathNode }) {
  const t = useT();
  const pick = usePick();
  const learning = useLearningState();
  const status = itemStatus(story, learning);
  const watched = status.type === "episode" && status.watched;
  const percent = status.type === "episode" ? status.percent : 0;
  const title = pick(story.title);
  const label = `${t("episodeN", { n: story.number })}: ${title}${watched ? `, ${t("watched")}` : ""}`;

  if (node.current) {
    return (
      <div data-path-current className="relative grid place-items-center">
        <span aria-hidden className="absolute size-[136px] rounded-full bg-sun/25 motion-safe:animate-pulse-next" />
        <Mascot pose="happy" className="absolute bottom-[calc(100%+2px)] w-20" />
        <Link
          href={`/watch/${story.id}`}
          onClick={playPop}
          aria-label={`${t("upNext")}, ${label}`}
          className="press press-play relative grid size-[100px] place-items-center rounded-full p-[7px]"
          // Progress ring: gold for the part watched, paper for the rest.
          style={{
            background: `conic-gradient(var(--c-sun) 0 ${percent}%, var(--c-paper) ${percent}% 100%)`,
          }}
        >
          <span className="grid size-full place-items-center rounded-full bg-play">
            <Play className="ml-1 size-10 fill-on-accent text-on-accent" strokeWidth={2.5} aria-hidden />
          </span>
        </Link>
        {/* Stones near an edge get their title pill pulled toward the middle, so it stays on screen. */}
        <span
          className={clsx(
            "absolute top-[calc(100%+14px)] max-w-[min(220px,calc(100vw-2rem))] truncate rounded-full bg-paper px-4 py-1.5 font-display text-base font-extrabold text-ink shadow-e1",
            node.x > 0.6 && "right-0",
            node.x < 0.4 && "left-0",
          )}
        >
          {title}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={`/watch/${story.id}`}
      onClick={playPop}
      aria-label={label}
      className={clsx(
        "press relative grid size-[72px] place-items-center rounded-full font-display text-[30px] font-extrabold leading-none",
        watched ? "press-sun bg-sun text-sun-ink" : "press-paper bg-paper text-ink-3",
      )}
    >
      <span aria-hidden>{story.number}</span>
      {watched && <WatchedMark className="absolute -right-2 -top-2 size-8" />}
    </Link>
  );
}

function ChallengeStone({ challenge, node }: { challenge: ChallengeCard; node: PathNode }) {
  const t = useT();
  const learning = useLearningState();
  const wiggle = useOneShot("animate-wiggle");
  const status = itemStatus(challenge, learning);
  if (status.type !== "challenge") return null;
  const done = challenge.requires.filter((id) => learning.episodes[id]?.watched).length;
  const size = node.current ? "size-[100px]" : "size-[92px]";

  const face = (
    <>
      <img
        src={status.done ? "/images/ui/gift-open.svg" : "/images/ui/gift.svg"}
        alt=""
        width={64}
        height={64}
        className="size-[64%]"
      />
      {status.locked && <LockMark className="absolute -right-1 -top-1" />}
      {status.done && <WatchedMark className="absolute -right-1 -top-1" />}
    </>
  );
  const below = status.done ? (
    <StarMarks stars={status.stars} className="absolute top-[calc(100%+12px)] rounded-full bg-paper px-2 py-1 shadow-e1" />
  ) : (
    <Pips
      done={done}
      total={challenge.requires.length}
      className="absolute top-[calc(100%+12px)] rounded-full bg-paper px-2.5 py-1.5 shadow-e1"
    />
  );
  const label = `${t("challengeN", { n: challenge.number })}${status.locked ? `, ${t("locked")}` : ""}`;
  const className = clsx(
    "press press-berry relative grid place-items-center rounded-full bg-berry-soft",
    size,
    node.current && "ring-4 ring-sun",
    wiggle.className,
  );

  return (
    <div className="relative grid place-items-center" data-path-current={node.current || undefined}>
      {node.current && <span aria-hidden className="absolute size-[136px] rounded-full bg-sun/25 motion-safe:animate-pulse-next" />}
      {status.locked ? (
        <button
          type="button"
          aria-disabled="true"
          aria-label={label}
          className={className}
          onClick={() => {
            playLocked();
            wiggle.trigger();
          }}
          {...wiggle.props}
        >
          {face}
        </button>
      ) : (
        <Link href={`/challenge/${challenge.id}`} onClick={playPop} aria-label={label} className={className}>
          {face}
        </Link>
      )}
      {below}
    </div>
  );
}
