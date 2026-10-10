"use client";

import clsx from "clsx";
import { Star, Volume2 } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { Question } from "@/content/types";
import { playCheer, playTryAgain } from "@/lib/sounds";
import { playPrompt, sayLine, stopVoice } from "@/lib/speech";
import { usePick, useSettings, useT } from "@/lib/store";
import { Mascot } from "./Mascot";

const ADVANCE_MS = 1200;
/** Taps this soon after a question appears are the tail of a double-tap on the button it replaced. */
const SETTLE_MS = 450;

type Props = {
  question: Question;
  /** Called ~1.2 s after the right answer, once the cheer has played. */
  onComplete: (result: { firstTryCorrect: boolean }) => void;
  className?: string;
};

/**
 * One picture question. Never punishes: a wrong pick wobbles gently, plays a
 * soft sound and "try again", then fades out. After two misses the right
 * answer starts to pulse.
 */
export function QuestionPanel({ question, onComplete, className }: Props) {
  const t = useT();
  const pick = usePick();
  const { language, placeholderVoice } = useSettings();
  const voice = { lang: language, placeholderVoice };

  const [wrong, setWrong] = useState<string[]>([]);
  const [correct, setCorrect] = useState(false);
  const [wobbling, setWobbling] = useState<string | null>(null);
  const shownAt = useRef(Number.POSITIVE_INFINITY);

  const announce = useEffectEvent(() => playPrompt(question, voice));
  useEffect(() => {
    shownAt.current = performance.now();
    announce();
    return stopVoice;
  }, [question.id]);

  const finish = useEffectEvent(() => onComplete({ firstTryCorrect: wrong.length === 0 }));
  useEffect(() => {
    if (!correct) return;
    const timer = setTimeout(finish, ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [correct]);

  /** `at` is the tap's event.timeStamp (same clock as performance.now()). */
  function choose(optionId: string, at: number) {
    if (correct || wrong.includes(optionId)) return;
    if (at - shownAt.current < SETTLE_MS) return;
    if (optionId === question.correctOptionId) {
      setCorrect(true);
      playCheer();
      sayLine("great", voice);
    } else {
      setWrong([...wrong, optionId]);
      setWobbling(optionId);
      playTryAgain();
      sayLine("tryAgain", voice);
    }
  }

  const scaffold = wrong.length >= 2 && !correct;

  return (
    <div
      className={clsx(
        "mx-auto flex w-full max-w-xl flex-col items-center gap-3 px-4 short:max-w-4xl short:flex-row short:items-center short:justify-center short:gap-6",
        className,
      )}
    >
      <div className="flex w-full flex-col items-center gap-3 short:w-48 short:shrink-0">
        {/* Izuba asks the question in a speech bubble; the blue button says it again. */}
        <div className="flex w-full items-center gap-2">
          <Mascot pose="happy" className="w-16 shrink-0 short:hidden tight:w-12" />
          <div className="relative flex min-w-0 flex-1 items-center gap-3 rounded-tile bg-paper p-2.5 pr-4 shadow-e2 inset-shadow-rim short:flex-col short:p-3 short:text-center">
            <span
              aria-hidden
              className="absolute -left-2 top-1/2 size-5 -translate-y-1/2 rotate-45 rounded-[4px] bg-paper short:hidden"
            />
            <button
              type="button"
              onClick={() => playPrompt(question, voice)}
              aria-label={t("listenAgain")}
              className="press press-listen relative grid size-[72px] shrink-0 place-items-center rounded-full bg-listen"
            >
              <Volume2 className="size-9 text-on-accent" strokeWidth={2.5} aria-hidden />
            </button>
            <p className="relative font-display text-[20px] font-extrabold leading-tight text-ink">{pick(question.promptText)}</p>
          </div>
        </div>
        {question.promptImage && (
          <img
            src={question.promptImage}
            alt=""
            width={240}
            height={240}
            className="h-36 w-auto rounded-card bg-paper p-2 shadow-e1 tight:h-[min(8rem,20dvh)] short:h-28"
          />
        )}
      </div>

      <div
        className={clsx(
          // Two columns, shrinking on short screens so both rows fit (never below 120px).
          "grid w-full grid-cols-[repeat(2,max(120px,min(calc(50%-0.375rem),26dvh)))] justify-center gap-3",
          // Counting questions: on very short screens the picture keeps its size; the cards give way.
          question.promptImage && "tight:grid-cols-[repeat(2,max(112px,min(calc(50%-0.375rem),20dvh)))]",
          "short:w-auto",
          // Sideways phones: size cards by the short screen height and the width left
          // next to the prompt (19rem), so nothing scrolls sideways (2×2 for four options).
          question.options.length === 2 && "short:grid-cols-[repeat(2,min(150px,62dvh,calc((100vw-19rem)/2)))]",
          question.options.length === 3 && "short:grid-cols-[repeat(3,min(140px,62dvh,calc((100vw-20rem)/3)))]",
          question.options.length === 4 && "short:grid-cols-[repeat(2,min(130px,38dvh))]",
          // A lone third option sits centered under the first two.
          question.options.length === 3 &&
            "[&>*:nth-child(3)]:col-span-2 [&>*:nth-child(3)]:w-[calc(50%-0.375rem)] [&>*:nth-child(3)]:justify-self-center short:[&>*:nth-child(3)]:col-span-1 short:[&>*:nth-child(3)]:w-full",
        )}
      >
        {question.options.map((option, i) => {
          const isRight = option.id === question.correctOptionId;
          const faded = wrong.includes(option.id);
          const won = correct && isRight;
          return (
            <button
              key={option.id}
              type="button"
              onClick={(e) => choose(option.id, e.timeStamp)}
              disabled={faded || correct}
              aria-label={option.label ?? `${i + 1}`}
              onAnimationEnd={() => setWobbling((w) => (w === option.id ? null : w))}
              className={clsx(
                "press press-paper relative grid aspect-square min-h-[120px] w-full place-items-center rounded-tile bg-paper p-2 transition-[opacity,filter] duration-300 short:min-h-0",
                question.promptImage && "tight:min-h-[112px]",
                won && "ring-4 ring-sun outline-8 outline-sun/30",
                faded && "bg-paper-2 opacity-40 grayscale",
                wobbling === option.id && "animate-wobble",
                // The hint after two misses; a steady gold outline when motion is reduced.
                scaffold && isRight && "motion-safe:animate-glow motion-reduce:outline-4 motion-reduce:outline-offset-2 motion-reduce:outline-sun",
                correct && !isRight && "opacity-60",
              )}
            >
              {/* A woven agaseke plate under each picture. */}
              <img src="/images/ui/plate.svg" alt="" width={240} height={240} className="absolute inset-[6%] size-[88%]" />
              <img src={option.image} alt="" width={240} height={240} className="relative size-[74%] object-contain" />
              {won && (
                <Star
                  className="absolute -right-3 -top-3 size-14 animate-pop fill-sun text-sun-lip"
                  strokeWidth={2.5}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>

      <p role="status" className="sr-only">
        {correct ? t("great") : wrong.length ? t("tryAgain") : ""}
      </p>
    </div>
  );
}
