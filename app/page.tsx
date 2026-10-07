import { brand } from "@/lib/brand";

// Temporary page for step 1 (design tokens). Replaced by the real Home in step 3.
const swatches = [
  ["cream-50", "bg-cream-50"],
  ["ink-900", "bg-ink-900"],
  ["ink-600", "bg-ink-600"],
  ["sky-500", "bg-sky-500"],
  ["sky-700", "bg-sky-700"],
  ["sun-400", "bg-sun-400"],
  ["leaf-300", "bg-leaf-300"],
  ["leaf-500", "bg-leaf-500"],
  ["leaf-700", "bg-leaf-700"],
  ["coral-400", "bg-coral-400"],
  ["grape-500", "bg-grape-500"],
  ["mist-300", "bg-mist-300"],
] as const;

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-4xl font-extrabold">{brand.name}</h1>
      <p className="text-ink-600">{brand.tagline.en}</p>
      <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {swatches.map(([name, cls]) => (
          <li key={name} className="rounded-card bg-white p-2 shadow-soft">
            <div className={`${cls} h-16 rounded-2xl border border-mist-300`} />
            <p className="mt-1 text-base">{name}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-4">
        <button className="tactile min-h-16 rounded-full bg-sky-700 px-8 font-display text-[22px] font-bold text-white">
          Primary
        </button>
        <button className="tactile min-h-16 rounded-full bg-leaf-700 px-8 font-display text-[22px] font-bold text-white">
          Green
        </button>
        <button className="tactile min-h-16 rounded-full bg-sun-400 px-8 font-display text-[22px] font-bold text-ink-900">
          Star
        </button>
      </div>
    </main>
  );
}
