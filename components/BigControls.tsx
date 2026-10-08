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
  const side = "tactile grid size-16 shrink-0 place-items-center rounded-full bg-white text-ink-900 disabled:opacity-50";
  return (
    <div className="mx-auto flex w-full max-w-md items-center justify-center gap-6 px-4 py-4 short:py-2">
      <button type="button" onClick={onHome} aria-label={t("home")} className={side}>
        <House className="size-8" strokeWidth={2.5} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onTogglePlay}
        disabled={!ready}
        aria-label={playing && !needsTap ? t("pause") : t("play")}
        className={clsx(
          "tactile grid shrink-0 place-items-center rounded-full bg-sky-700 text-white transition-[width,height] disabled:opacity-60",
          needsTap ? "size-28 motion-safe:animate-pulse-next short:size-20" : "size-20",
        )}
      >
        {playing && !needsTap ? (
          <Pause className="size-10 fill-white" strokeWidth={2.5} aria-hidden />
        ) : (
          <Play className={clsx("ml-1.5 fill-white", needsTap ? "size-14" : "size-10")} strokeWidth={2.5} aria-hidden />
        )}
      </button>
      <button type="button" onClick={onReplay} disabled={!ready} aria-label={t("replay")} className={side}>
        <RotateCcw className="size-8" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}
