import type { Metadata } from "next";
import { StickerGrid } from "@/components/StickerGrid";
import { TimeGate } from "@/components/TimesUp";
import { getStickerSlots } from "@/content";

export const metadata: Metadata = { title: "Stickers" };

export default function StickersPage() {
  return (
    <TimeGate mode="live">
      <StickerGrid slots={getStickerSlots()} />
    </TimeGate>
  );
}
