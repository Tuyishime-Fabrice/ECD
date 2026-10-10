"use client";

import clsx from "clsx";
import { House, Pause, Play, RotateCcw } from "lucide-react";
import { useT } from "@/lib/store";

type Props = {
  ready: boolean;
  playing: boolean;
  /** The phone blocked autoplay: make Play giant and pulsing. */
  needsTap: boolean;
  onHome: () => void;
  onTogglePlay: () => void;
  onReplay: () => void;
};

/** Our own chunky controls, always below the video, never on top of it. */
export function BigControls({ ready, playing, needsTap, onHome, onTogglePlay, onReplay }: Props) {
  const t = useT();
  const side = "press press-paper grid size-16 shrink-0 place-items-center rounded-full bg-paper text-ink disabled:opacity-50";
  return (
    <div className="mx-auto flex w-full max-w-md items-center justify-center gap-7 px-4 pb-4 pt-4 short:py-2">
      <button type="button" onClick={onHome} aria-label={t("home")} className={side}>
        <House className="size-8" strokeWidth={2.5} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onTogglePlay}
        disabled={!ready}
        aria-label={playing && !needsTap ? t("pause") : t("play")}
        className={clsx(
          "press press-play grid shrink-0 place-items-center rounded-full bg-play text-on-accent transition-[width,height] disabled:opacity-60",
          needsTap ? "size-28 motion-safe:animate-pulse-next short:size-20" : "size-20",
        )}
      >
        {playing && !needsTap ? (
          <Pause className="size-10 fill-on-accent" strokeWidth={2.5} aria-hidden />
        ) : (
          <Play className={clsx("ml-1.5 fill-on-accent", needsTap ? "size-14" : "size-10")} strokeWidth={2.5} aria-hidden />
        )}
      </button>
      <button type="button" onClick={onReplay} disabled={!ready} aria-label={t("replay")} className={side}>
        <RotateCcw className="size-8" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}
