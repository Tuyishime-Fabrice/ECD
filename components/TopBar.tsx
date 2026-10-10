"use client";

import clsx from "clsx";
import { Lock, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { brand } from "@/lib/brand";
import { useIsImmersive } from "@/lib/immersive";
import { playPop } from "@/lib/sounds";
import { useProgress, useT } from "@/lib/store";

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return scrolled;
}

export function TopBar() {
  const t = useT();
  const immersive = useIsImmersive();
  const scrolled = useScrolled();
  const stickers = useProgress((s) => s.stickers.length);

  return (
    <header
      className={clsx(
        "sticky top-0 z-30 transition-[background-color,box-shadow] duration-200",
        scrolled ? "bg-paper shadow-e1" : "bg-transparent",
        // While watching or answering on a short screen, give the content every pixel.
        immersive && "short:hidden tight:hidden",
      )}
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-8">
        <Link
          href="/"
          aria-label={`${brand.name}, ${t("home")}`}
          onClick={playPop}
          className="tap flex min-h-16 items-center gap-2 rounded-full pr-3"
        >
          <img src={brand.logo} alt="" width={44} height={44} className="size-11" />
          <span className="font-display text-[28px] font-extrabold leading-none tracking-[-0.02em] text-ink">
            {brand.name}
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/stickers"
            aria-label={t("myStickers")}
            onClick={playPop}
            className="tap relative grid size-16 place-items-center rounded-full bg-sun-soft shadow-e1 inset-shadow-rim"
          >
            <Star className="size-8 fill-sun text-sun-lip" strokeWidth={2.5} aria-hidden />
            {stickers > 0 && (
              <span
                aria-hidden
                className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full border-2 border-paper bg-coral px-1.5 text-xs font-extrabold text-coral-ink"
              >
                {stickers}
              </span>
            )}
          </Link>
          <Link
            href="/parents"
            aria-label={t("parents")}
            className="tap grid size-16 place-items-center rounded-full bg-paper shadow-e1 inset-shadow-rim"
          >
            <Lock className="size-6 text-ink-2" strokeWidth={2.5} aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
