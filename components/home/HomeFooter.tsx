"use client";

import { Lock, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { playPop } from "@/lib/sounds";
import { useT } from "@/lib/store";
import { Scene } from "../kid/Scene";

const pill =
  "tap inline-flex min-h-12 items-center gap-2 rounded-full border border-line bg-paper px-4 text-base font-bold text-ink shadow-e1";

/** The bottom of Home: a strip of hills, then the brand and grown-up links. Internal links only. */
export function HomeFooter() {
  const t = useT();
  return (
    <footer className="mt-12">
      <Scene name="home-hills" className="block" imgClassName="block h-28 w-full object-cover object-bottom md:h-40" />
      <div className="border-t border-line bg-paper pb-[max(2rem,env(safe-area-inset-bottom))] pt-8">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-sm">
              <img src="/brand/logo.webp" alt={brand.name} width={208} height={80} className="brand-logo h-20 w-auto" />
              {/* The logo carries the English tagline; the Kinyarwanda one sits under it. */}
              <p lang="rw" className="mt-3 font-display text-lg font-black text-brand">
                {brand.tagline.rw}
              </p>
              <p className="mt-1 text-base leading-relaxed text-ink-2">{t("footerAbout")}</p>
            </div>
            <nav className="flex flex-wrap gap-3" aria-label={t("footerLinks")}>
              <Link href="/stickers" onClick={playPop} className={pill}>
                <Star className="size-5 fill-sun text-sun-lip" strokeWidth={2.25} aria-hidden />
                {t("myStickers")}
              </Link>
              <Link href="/parents" className={pill}>
                <Lock className="size-5 text-brand" strokeWidth={2.5} aria-hidden />
                {t("parentArea")}
              </Link>
            </nav>
          </div>
          <div className="mt-8 flex flex-col gap-2 border-t border-line pt-5 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between">
            <p>© {brand.name}</p>
            <p className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 shrink-0 text-brand" strokeWidth={2.5} aria-hidden />
              {t("footerPrivacy")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
