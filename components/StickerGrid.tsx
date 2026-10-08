"use client";

import clsx from "clsx";
import { Star } from "lucide-react";
import type { StickerSlot } from "@/content/types";
import { playLocked, playSparkle } from "@/lib/sounds";
import { useDocumentTitle, useProgress, usePick, useT } from "@/lib/store";
import { useOneShot } from "./useWiggle";

function Slot({ slot, earned }: { slot: StickerSlot; earned: boolean }) {
  const t = useT();
  const pick = usePick();
  const bounce = useOneShot(earned ? "animate-bounce-once" : "animate-wiggle");
  const title = pick(slot.title);

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          if (earned) playSparkle();
          else playLocked();
          bounce.trigger();
        }}
        aria-label={earned ? title : `${title}: ${t("stickerLocked")}`}
        className="tactile flex w-full flex-col items-center gap-2 rounded-card bg-white p-4"
      >
        <span className={clsx("block aspect-square w-full max-w-44", bounce.className)} {...bounce.props}>
          <img
            src={slot.sticker}
            alt=""
            width={200}
            height={200}
            className={clsx("size-full", !earned && "opacity-20 brightness-0")}
          />
        </span>
        <span className={clsx("text-base font-semibold", earned ? "text-ink-900" : "text-ink-600")}>{title}</span>
      </button>
    </li>
  );
}

export function StickerGrid({ slots }: { slots: StickerSlot[] }) {
  const t = useT();
  const earned = useProgress((s) => s.stickers);
  useDocumentTitle(t("myStickers"));
  const count = slots.filter((s) => earned.includes(s.challengeId)).length;

  return (
    <section className="mx-auto max-w-3xl px-4">
      <h1 className="flex items-center gap-3 font-display text-[36px] font-extrabold text-ink-900">
        <span className="grid size-14 place-items-center rounded-full bg-sun-400 shadow-tactile">
          <Star className="size-8 fill-white text-ink-900" strokeWidth={2.5} aria-hidden />
        </span>
        {t("myStickers")}
        <span className="ml-auto rounded-full bg-white px-4 py-1 text-2xl shadow-soft">
          {count}/{slots.length}
        </span>
      </h1>
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {slots.map((slot) => (
          <Slot key={slot.challengeId} slot={slot} earned={earned.includes(slot.challengeId)} />
        ))}
      </ul>
    </section>
  );
}
