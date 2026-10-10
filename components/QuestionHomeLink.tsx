"use client";

import { House } from "lucide-react";
import Link from "next/link";
import { playPop } from "@/lib/sounds";
import { useT } from "@/lib/store";

/**
 * On short screens the top bar steps aside while a question shows (see TopBar);
 * this keeps a way home on exactly those screens.
 */
export function QuestionHomeLink({ className }: { className?: string }) {
  const t = useT();
  return (
    <Link
      href="/"
      onClick={playPop}
      aria-label={t("home")}
      className={`press press-paper hidden size-16 shrink-0 place-items-center rounded-full bg-paper text-ink short:grid tight:grid ${className ?? ""}`}
    >
      <House className="size-8" strokeWidth={2.5} aria-hidden />
    </Link>
  );
}
