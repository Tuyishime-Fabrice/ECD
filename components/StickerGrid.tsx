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
        className="tap flex w-full flex-col items-center gap-2 rounded-card bg-paper p-4 shadow-e1 inset-shadow-rim"
      >
        <span className={clsx("block aspect-square w-full max-w-44", bounce.className)} {...bounce.props}>
          {/* Not earned yet: a gift-colored "?" slot, never a grey hole. */}
          <img src={earned ? slot.sticker : "/images/ui/sticker-slot.svg"} alt="" width={200} height={200} className="size-full" />
        </span>
        <span className={clsx("font-display text-base font-bold leading-tight", earned ? "text-ink" : "text-ink-2")}>
          {title}
        </span>
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
    <section className="mx-auto max-w-3xl px-4 pb-10">
      <h1 className="flex items-center gap-3 font-display text-[34px] font-extrabold text-ink">
        <span className="grid size-14 place-items-center rounded-full bg-sun-soft shadow-e1 inset-shadow-rim">
          <Star className="size-8 fill-sun text-sun-lip" strokeWidth={2.5} aria-hidden />
        </span>
        {t("myStickers")}
        <span className="ml-auto rounded-full bg-paper px-4 py-1 text-2xl text-ink shadow-e1">
          {count}/{slots.length}
        </span>
      </h1>
      {/* The sticker album: one page with a slot per challenge. */}
      <ul className="mt-6 grid grid-cols-2 gap-4 rounded-hero bg-paper-2 p-4 shadow-e2 inset-shadow-rim sm:grid-cols-3 sm:p-6">
        {slots.map((slot) => (
          <Slot key={slot.challengeId} slot={slot} earned={earned.includes(slot.challengeId)} />
        ))}
      </ul>
    </section>
  );
}
