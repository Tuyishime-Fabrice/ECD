import { House } from "lucide-react";
import Link from "next/link";
import { Mascot } from "@/components/Mascot";
import { T } from "@/components/Text";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <Mascot pose="oops" className="w-40" />
      <p className="font-display text-3xl font-bold text-ink">
        <T k="notFound" />
      </p>
      <Link
        href="/"
        className="press press-play inline-flex min-h-16 items-center gap-3 rounded-full bg-play px-8 font-display text-[22px] font-bold text-on-accent"
      >
        <House className="size-8" strokeWidth={2.5} aria-hidden />
        <T k="home" />
      </Link>
    </main>
  );
}
