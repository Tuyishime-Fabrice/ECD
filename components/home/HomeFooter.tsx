"use client";

import { Lock, Star } from "lucide-react";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { playPop } from "@/lib/sounds";
import { useLang, useT } from "@/lib/store";
import { Scene } from "../kid/Scene";

/** The bottom of Home: a strip of hills, then the brand and grown-up links. Internal links only. */
export function HomeFooter() {
  const t = useT();
  const lang = useLang();
  return (
    <footer className="mt-10">
      <Scene name="home-hills" className="block" imgClassName="block h-28 w-full object-cover object-bottom md:h-40" />
      <div className="bg-paper-2 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src={brand.logo} alt="" width={44} height={44} className="size-11" />
            <div>
              <p className="font-display text-2xl font-extrabold leading-none text-ink">{brand.name}</p>
              <p className="mt-1 text-sm text-ink-2">{brand.tagline[lang]}</p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-3" aria-label={brand.name}>
            <Link
              href="/stickers"
              onClick={playPop}
              className="tap inline-flex min-h-12 items-center gap-2 rounded-full bg-paper px-4 font-semibold text-ink shadow-e1"
            >
              <Star className="size-5 fill-sun text-sun-lip" strokeWidth={2.5} aria-hidden />
              {t("myStickers")}
            </Link>
            <Link
              href="/parents"
              className="tap inline-flex min-h-12 items-center gap-2 rounded-full bg-paper px-4 font-semibold text-ink shadow-e1"
            >
              <Lock className="size-5 text-ink-2" strokeWidth={2.5} aria-hidden />
              {t("parents")}
            </Link>
          </nav>
        </div>
        <p className="mx-auto mt-6 max-w-6xl text-xs text-ink-3">© {brand.name}</p>
      </div>
    </footer>
  );
}
