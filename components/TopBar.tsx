"use client";

import clsx from "clsx";
import { Lock, Star } from "lucide-react";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { useIsImmersive } from "@/lib/immersive";
import { playPop } from "@/lib/sounds";
import { useProgress, useT } from "@/lib/store";

/**
 * The app bar on every kid screen: the ECD Imuhira wordmark (home) on the left,
 * the sticker album and the parents' lock on the right. Solid, with a hairline
 * under it, so it reads the same over every page.
 */
export function TopBar() {
  const t = useT();
  const immersive = useIsImmersive();
  const stickers = useProgress((s) => s.stickers.length);

  return (
    <header
      className={clsx(
        "sticky top-0 z-30 border-b border-line bg-ground",
        // While watching or answering on a short screen, give the content every pixel.
        immersive && "short:hidden tight:hidden",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 pb-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))] md:px-8">
        <Link
          href="/"
          aria-label={`${brand.name}, ${t("home")}`}
          onClick={playPop}
          className="tap -ml-1 flex min-h-16 items-center rounded-2xl px-1"
        >
          {/* The wordmark turns its teal parts cream in dark mode by itself. */}
          <img src="/brand/wordmark.svg" alt="" width={140} height={40} className="h-9 w-auto sm:h-10" />
        </Link>

        <nav aria-label={brand.name} className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            href="/stickers"
            aria-label={t("myStickers")}
            onClick={playPop}
            className="tap flex h-16 min-w-16 items-center justify-center gap-1.5 rounded-full border border-line bg-sun-soft px-4 shadow-e1"
          >
            <Star className="size-8 shrink-0 fill-sun text-sun-lip" strokeWidth={2.25} aria-hidden />
            {stickers > 0 && (
              <span aria-hidden className="font-display text-xl font-black tabular-nums leading-none text-ink">
                {stickers}
              </span>
            )}
          </Link>
          {/* For grown-ups: visually quieter, still a 64px target. */}
          <Link href="/parents" aria-label={t("parents")} className="tap group grid size-16 place-items-center rounded-full">
            <span className="grid size-12 place-items-center rounded-full border border-line bg-paper shadow-e1">
              <Lock className="size-5 text-ink-2" strokeWidth={2.5} aria-hidden />
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
