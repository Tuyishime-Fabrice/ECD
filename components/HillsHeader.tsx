import { Mascot } from "./Mascot";
import { T } from "./Text";

/** Layered green Rwandan hills with the (placeholder) sun mascot rising behind them. */
export function HillsHeader() {
  return (
    <div className="relative mx-4 h-44 overflow-hidden rounded-card bg-sky-100 sm:h-56 short:h-24">
      <svg className="absolute left-[44%] top-3 w-14 sm:left-[30%] sm:w-24" viewBox="0 0 64 32" aria-hidden>
        <path d="M10 30C0 30 0 14 12 14C14 4 30 2 34 12C40 4 56 8 54 20C64 20 64 30 56 30Z" className="fill-white" />
      </svg>
      <svg className="absolute right-[42%] top-12 hidden w-16 sm:block" viewBox="0 0 64 32" aria-hidden>
        <path d="M10 30C0 30 0 14 12 14C14 4 30 2 34 12C40 4 56 8 54 20C64 20 64 30 56 30Z" className="fill-white" />
      </svg>

      <div className="absolute bottom-[22%] right-[10%] w-32 motion-safe:animate-float sm:w-40 short:w-16">
        <Mascot pose="wave" className="w-full" />
      </div>

      <svg
        className="absolute inset-x-0 bottom-0 h-[62%] w-full"
        viewBox="0 0 400 120"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d="M0 52C60 18 120 22 180 46C230 66 300 20 400 34V120H0Z" className="fill-leaf-300" />
        <path d="M0 78C70 52 150 60 220 78C290 96 340 66 400 64V120H0Z" className="fill-leaf-500" />
        <path d="M0 102C80 86 170 92 250 104C320 114 360 98 400 96V120H0Z" className="fill-leaf-700" />
      </svg>

      <h1 className="absolute left-5 top-4 font-display text-[40px] font-extrabold text-ink-900 sm:top-6 short:top-2 short:text-[32px]">
        <T k="hello" />
      </h1>
    </div>
  );
}
