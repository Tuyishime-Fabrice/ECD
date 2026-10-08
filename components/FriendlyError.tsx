"use client";

import { House, RotateCcw, WifiOff } from "lucide-react";
import Link from "next/link";
import { useT } from "@/lib/store";
import { Mascot } from "./Mascot";

/** Gentle "something went wrong" screen: no red, no error codes. */
export function FriendlyError({ offline, onRetry }: { offline: boolean; onRetry?: () => void }) {
  const t = useT();
  return (
    <section className="mx-auto flex w-full max-w-md animate-fade-in flex-col items-center gap-4 px-6 py-6 text-center">
      <div className="relative">
        <Mascot pose="oops" className="w-32 short:w-20" />
        {offline && (
          <span className="absolute -bottom-1 -right-2 grid size-12 place-items-center rounded-full bg-white shadow-soft">
            <WifiOff className="size-7 text-ink-600" strokeWidth={2.5} aria-hidden />
          </span>
        )}
      </div>
      <h2 className="font-display text-[28px] font-bold leading-tight text-ink-900">
        {offline ? t("offlineTitle") : t("videoErrorTitle")}
      </h2>
      <p className="text-lg text-ink-600">{offline ? t("offlineHint") : t("videoErrorHint")}</p>
      <div className="mt-2 flex items-center gap-4">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="tactile inline-flex min-h-16 items-center gap-2 rounded-full bg-white px-6 font-display text-[22px] font-bold text-ink-900"
          >
            <RotateCcw className="size-7" strokeWidth={2.5} aria-hidden />
            {t("tryAgainButton")}
          </button>
        )}
        <Link
          href="/"
          className="tactile inline-flex min-h-16 items-center gap-2 rounded-full bg-sky-700 px-6 font-display text-[22px] font-bold text-white"
        >
          <House className="size-7" strokeWidth={2.5} aria-hidden />
          {t("home")}
        </Link>
      </div>
    </section>
  );
}
