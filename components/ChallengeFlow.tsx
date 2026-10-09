"use client";

import clsx from "clsx";
import { ChevronRight, House, Play, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ChallengeView, SeasonCard } from "@/content/types";
import { useImmersive } from "@/lib/immersive";
import { starsFor, type QuestionResult, type Stars } from "@/lib/progress";
import { useUsageTicker } from "@/lib/screen-time";
import { itemStatus, nextAfter } from "@/lib/recommend";
import { playPop, playSparkle, unlockAudio } from "@/lib/sounds";
import { primeVoice } from "@/lib/speech";
import { getStore, useDocumentTitle, useHydrated, useLearningState, usePick, useT } from "@/lib/store";
import { isChallengeUnlocked, missingForChallenge } from "@/lib/unlock";
import { itemHref } from "./ItemCard";
import { LockMark } from "./kid/marks";
import { StoryCard } from "./kid/StoryCard";
import { Mascot } from "./Mascot";
import { QuestionHomeLink } from "./QuestionHomeLink";
import { QuestionPanel } from "./QuestionPanel";
import { StarBurst } from "./StarBurst";

type Phase = { kind: "intro" } | { kind: "question"; index: number } | { kind: "done"; stars: Stars; newSticker: boolean };

const bigButton =
  "press inline-flex min-h-16 items-center justify-center gap-3 rounded-full px-8 font-display text-[22px] font-bold";

export function ChallengeFlow({ challenge, seasons }: { challenge: ChallengeView; seasons: SeasonCard[] }) {
  const t = useT();
  const hydrated = useHydrated();
  const learning = useLearningState();
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const [results, setResults] = useState<QuestionResult[]>([]);
  useDocumentTitle(t("challengeN", { n: challenge.number }));
  useImmersive(phase.kind === "question");
  // Screen time counts while a challenge is open.
  useUsageTicker(hydrated);

  // Saved progress is unknown until hydration; the intro shows meanwhile (Start waits).
  if (hydrated && phase.kind === "intro" && !isChallengeUnlocked(challenge, learning)) {
    return <LockedChallenge challenge={challenge} seasons={seasons} />;
  }

  function start() {
    unlockAudio();
    primeVoice();
    playPop();
    setResults([]);
    setPhase({ kind: "question", index: 0 });
  }

  function answered(index: number, firstTryCorrect: boolean) {
    const question = challenge.questions[index];
    if (!question) return;
    const all = [...results, { questionId: question.id, skill: question.skill, firstTryCorrect }];
    setResults(all);
    if (index + 1 < challenge.questions.length) {
      setPhase({ kind: "question", index: index + 1 });
      return;
    }
    const store = getStore();
    const stars = starsFor(all.filter((r) => r.firstTryCorrect).length);
    const newSticker = !store.getStickers().includes(challenge.id);
    store.recordChallenge(challenge.id, { stars, completedAt: Date.now(), questions: all });
    setPhase({ kind: "done", stars, newSticker });
  }

  if (phase.kind === "intro") {
    return (
      <section className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-4 text-center short:max-w-3xl short:flex-row short:justify-center short:gap-8 short:py-2">
        {/* The sticker they'll win: a reason to play (and the page's main picture). */}
        <div className="relative grid size-48 place-items-center short:size-40">
          <svg className="absolute inset-0 size-full motion-safe:animate-spin-slow" viewBox="0 0 100 100" aria-hidden>
            {Array.from({ length: 12 }, (_, i) => (
              <path key={i} d="M50 50 L46 0 L54 0 Z" className="fill-sun" opacity="0.45" transform={`rotate(${i * 30} 50 50)`} />
            ))}
          </svg>
          <img
            src={challenge.sticker}
            alt=""
            width={200}
            height={200}
            fetchPriority="high"
            className="relative size-40 short:size-32"
          />
          <Mascot pose="wave" className="absolute -bottom-2 -left-6 w-20 motion-safe:animate-float" />
        </div>
        <div className="flex flex-col items-center gap-5">
          <h1 className="font-display text-[40px] font-extrabold leading-tight text-ink">{t("letsPlay")}</h1>
          <button
            type="button"
            onClick={start}
            disabled={!hydrated}
            className={clsx(bigButton, "press-play min-h-24 bg-play px-10 text-[28px] text-on-accent motion-safe:animate-pulse-next")}
          >
            <Play className="size-10 fill-on-accent" strokeWidth={2.5} aria-hidden />
            {t("start")}
          </button>
        </div>
      </section>
    );
  }

  if (phase.kind === "question") {
    const question = challenge.questions[phase.index];
    if (!question) return null;
    return (
      <section className="py-2">
        <h1 className="sr-only">{t("challengeN", { n: challenge.number })}</h1>
        <div className="relative flex items-center justify-center px-4">
          <QuestionHomeLink className="absolute left-4" />
          <ProgressDots current={phase.index} total={challenge.questions.length} results={results} />
        </div>
        <QuestionPanel
          key={question.id}
          question={question}
          onComplete={({ firstTryCorrect }) => answered(phase.index, firstTryCorrect)}
          className="mt-4 short:mt-2"
        />
      </section>
    );
  }

  return (
    <ChallengeDone
      challenge={challenge}
      stars={phase.stars}
      newSticker={phase.newSticker}
      next={nextAfter(seasons, challenge.id, learning)}
    />
  );
}

function ProgressDots({ current, total, results }: { current: number; total: number; results: QuestionResult[] }) {
  const t = useT();
  return (
    <div
      className="flex items-center justify-center gap-2.5 rounded-full bg-paper px-4 py-2 shadow-e1"
      role="img"
      aria-label={t("questionNofM", { n: current + 1, m: total })}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={clsx(
            "rounded-full transition-all",
            i === current ? "size-6 bg-sun ring-4 ring-sun/30" : "size-4",
            i < current && (results[i]?.firstTryCorrect ? "bg-sun" : "bg-leaf"),
            i > current && "bg-paper-2 ring-2 ring-line",
          )}
        />
      ))}
      <img src="/images/ui/gift.svg" alt="" width={28} height={28} className="ml-1 size-7" />
    </div>
  );
}

function ChallengeDone({
  challenge,
  stars,
  newSticker,
  next,
}: {
  challenge: ChallengeView;
  stars: Stars;
  newSticker: boolean;
  next: ReturnType<typeof nextAfter>;
}) {
  const t = useT();
  const pick = usePick();

  useEffect(() => {
    const timer = setTimeout(playSparkle, 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-2 text-center">
      <h1 className="font-display text-[36px] font-extrabold text-ink">{t("wellDone")}</h1>

      <div className="mt-2 flex items-end gap-2" role="img" aria-label={t("starsN", { n: stars })}>
        {[1, 2, 3].map((i) => (
          <Star
            key={i}
            aria-hidden
            strokeWidth={2.5}
            style={{ animationDelay: `${i * 180}ms` }}
            className={clsx(
              "animate-pop",
              i === 2 ? "size-20" : "size-16",
              i <= stars ? "fill-sun text-sun-lip" : "fill-paper-2 text-line",
            )}
          />
        ))}
      </div>

      <div className="relative mt-4 grid size-56 place-items-center short:size-40">
        <svg className="absolute inset-0 size-full motion-safe:animate-spin-slow" viewBox="0 0 100 100" aria-hidden>
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M50 50 L46 0 L54 0 Z" className="fill-sun" opacity="0.55" transform={`rotate(${i * 30} 50 50)`} />
          ))}
        </svg>
        <StarBurst />
        <img
          src={challenge.sticker}
          alt=""
          width={200}
          height={200}
          className="relative size-44 animate-pop [animation-delay:700ms] short:size-32"
        />
      </div>
      {newSticker && (
        <p className="mt-1 animate-fade-in font-display text-2xl font-bold text-play-ink [animation-delay:900ms]">
          {t("newSticker")}
        </p>
      )}
      <p className="sr-only">{pick(challenge.title)}</p>

      <div className="mt-6 flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center">
        {next && (
          <Link href={itemHref(next)} onClick={playPop} className={clsx(bigButton, "press-play w-full bg-play text-on-accent sm:w-auto")}>
            {next.type === "episode" ? t("nextEpisode") : t("next")}
            <ChevronRight className="size-8" strokeWidth={3} aria-hidden />
          </Link>
        )}
        <Link href="/" onClick={playPop} className={clsx(bigButton, "press-paper bg-paper text-ink")}>
          <House className="size-8" strokeWidth={2.5} aria-hidden />
          {t("home")}
        </Link>
      </div>
    </section>
  );
}

function LockedChallenge({ challenge, seasons }: { challenge: ChallengeView; seasons: SeasonCard[] }) {
  const t = useT();
  const learning = useLearningState();
  const season = seasons.find((s) => s.slug === challenge.seasonSlug);
  const missing = missingForChallenge(challenge, learning);
  const items = season?.items.filter((i) => missing.includes(i.id)) ?? [];

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-4 text-center">
      <span className="relative grid size-28 place-items-center rounded-full bg-berry-soft shadow-e2">
        <img src="/images/ui/gift.svg" alt="" width={72} height={72} className="size-[68%]" />
        <LockMark className="absolute -right-1 -top-1" />
      </span>
      <h1 className="font-display text-[32px] font-extrabold leading-tight text-ink">{t("watchFirst")}</h1>
      <ul className="grid w-full grid-cols-2 gap-3">
        {items.map((item) => {
          const status = itemStatus(item, learning);
          return item.type === "episode" && status.type === "episode" ? (
            <li key={item.id} className="flex">
              <StoryCard story={item} status={status} className="w-full md:w-full" />
            </li>
          ) : null;
        })}
      </ul>
      <Link href="/" onClick={playPop} className={clsx(bigButton, "press-paper mt-2 bg-paper text-ink")}>
        <House className="size-8" strokeWidth={2.5} aria-hidden />
        {t("home")}
      </Link>
    </section>
  );
}
