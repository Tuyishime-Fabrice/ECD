import type { Metadata } from "next";
import { StickerGrid } from "@/components/StickerGrid";
import { getStickerSlots } from "@/content";

export const metadata: Metadata = { title: "Stickers" };

export default function StickersPage() {
  return <StickerGrid slots={getStickerSlots()} />;
}
