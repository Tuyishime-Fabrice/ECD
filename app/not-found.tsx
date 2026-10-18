import { House } from "lucide-react";
import Link from "next/link";
import { Mascot } from "@/components/Mascot";
import { T } from "@/components/Text";
import { brand } from "@/lib/brand";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <img src="/brand/logo-sm.webp" alt={brand.name} width={125} height={48} className="brand-logo mb-4 h-12 w-auto" />
      <Mascot pose="oops" className="w-36" />
      <p className="font-display text-[28px] font-black leading-tight text-ink">
        <T k="notFound" />
      </p>
      <Link
        href="/"
        className="press press-play inline-flex min-h-16 items-center gap-3 rounded-full bg-play px-8 font-display text-[22px] font-black text-on-accent"
      >
        <House className="size-8" strokeWidth={2.5} aria-hidden />
        <T k="home" />
      </Link>
    </main>
  );
}
