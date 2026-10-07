"use client";

import clsx from "clsx";
import { Star, Volume2 } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";
import type { Question } from "@/content/types";
import { playCheer, playTryAgain } from "@/lib/sounds";
import { playPrompt, sayLine, stopVoice } from "@/lib/speech";
import { usePick, useSettings, useT } from "@/lib/store";

const ADVANCE_MS = 1200;

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

  const announce = useEffectEvent(() => playPrompt(question, voice));
  useEffect(() => {
    announce();
    return stopVoice;
  }, [question.id]);

  const finish = useEffectEvent(() => onComplete({ firstTryCorrect: wrong.length === 0 }));
  useEffect(() => {
    if (!correct) return;
    const timer = setTimeout(finish, ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [correct]);

  function choose(optionId: string) {
    if (correct || wrong.includes(optionId)) return;
    if (optionId === question.correctOptionId) {
      setCorrect(true);
      stopVoice();
      playCheer();
    } else {
      setWrong([...wrong, optionId]);
      setWobbling(optionId);
      playTryAgain();
      sayLine("tryAgain", voice);
    }
  }

  const scaffold = wrong.length >= 2 && !correct;
  const many = question.options.length > 2;

  return (
    <div
      className={clsx(
        "mx-auto flex w-full max-w-xl flex-col items-center gap-3 px-4 short:max-w-4xl short:flex-row short:items-center short:gap-5",
        className,
      )}
    >
      <div className="flex w-full flex-col items-center gap-3 short:w-auto short:max-w-[38%] short:shrink-0">
        <div className="flex w-full items-center gap-3">
          <button
            type="button"
            onClick={() => playPrompt(question, voice)}
            aria-label={t("listenAgain")}
            className="tactile grid size-16 shrink-0 place-items-center rounded-full bg-sun-400"
          >
            <Volume2 className="size-9 text-ink-900" strokeWidth={2.5} aria-hidden />
          </button>
          <p className="text-base font-semibold leading-snug text-ink-600">{pick(question.promptText)}</p>
        </div>
        {question.promptImage && (
          <img
            src={question.promptImage}
            alt=""
            width={240}
            height={240}
            className="h-36 w-auto rounded-card bg-white p-2 shadow-soft short:h-32"
          />
        )}
      </div>

      <div
        className={clsx(
          "grid w-full grid-cols-2 gap-3 sm:gap-4",
          many && "short:grid-cols-4",
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
              onClick={() => choose(option.id)}
              disabled={faded || correct}
              aria-label={option.label ?? `${i + 1}`}
              onAnimationEnd={() => setWobbling((w) => (w === option.id ? null : w))}
              className={clsx(
                "tactile relative aspect-square min-h-[120px] w-full rounded-card border-4 bg-white p-2 transition-[opacity,filter,border-color] duration-300 short:min-h-0 short:max-h-[42dvh]",
                won ? "border-leaf-500 shadow-[0_0_0_8px_rgba(61,174,107,0.35)]" : "border-transparent",
                faded && "bg-mist-100 opacity-40 grayscale",
                wobbling === option.id && "animate-wobble",
                scaffold && isRight && "motion-safe:animate-glow",
                correct && !isRight && "opacity-60",
              )}
            >
              <img src={option.image} alt="" width={240} height={240} className="size-full object-contain" />
              {won && (
                <Star
                  className="absolute -right-3 -top-3 size-14 animate-pop fill-sun-400 text-ink-900"
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
