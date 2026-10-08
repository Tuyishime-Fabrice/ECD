import type { SeasonColor } from "@/content/types";

/** Full class names per season color (Tailwind needs literal strings). Text on `bg` is ink-900. */
export const seasonTheme: Record<SeasonColor, { bg: string; soft: string; border: string; ring: string }> = {
  sky: { bg: "bg-sky-500", soft: "bg-sky-100", border: "border-sky-500", ring: "ring-sky-500" },
  coral: { bg: "bg-coral-400", soft: "bg-coral-100", border: "border-coral-400", ring: "ring-coral-400" },
  leaf: { bg: "bg-leaf-500", soft: "bg-leaf-100", border: "border-leaf-500", ring: "ring-leaf-500" },
  grape: { bg: "bg-grape-500", soft: "bg-grape-100", border: "border-grape-500", ring: "ring-grape-500" },
};
