"use client";

import clsx from "clsx";
import { Lock, Star } from "lucide-react";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { useIsImmersive } from "@/lib/immersive";
import { playPop } from "@/lib/sounds";
import { useT } from "@/lib/store";

export function TopBar() {
  const t = useT();
  const immersive = useIsImmersive();

  return (
    <header
      className={clsx(
        "flex items-center gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]",
        // While watching or answering on a short screen, give the content every pixel.
        immersive && "short:hidden tight:hidden",
      )}
    >
      <Link
        href="/"
        aria-label={`${brand.name}, ${t("home")}`}
        onClick={playPop}
        className="flex min-h-16 items-center gap-2 rounded-full pr-3 active:scale-95"
      >
        <img src={brand.logo} alt="" width={48} height={48} className="size-12" />
        <span className="font-display text-[28px] font-extrabold leading-none text-sky-700">{brand.name}</span>
      </Link>

      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/stickers"
          aria-label={t("myStickers")}
          onClick={playPop}
          className="tactile grid size-16 place-items-center rounded-full bg-sun-400"
        >
          <Star className="size-9 fill-white text-ink-900" strokeWidth={2.5} aria-hidden />
        </Link>
        <Link
          href="/parents"
          aria-label={t("parents")}
          className="grid size-11 place-items-center rounded-full text-ink-600"
        >
          <Lock className="size-5" strokeWidth={2.5} aria-hidden />
        </Link>
      </div>
    </header>
  );
}
