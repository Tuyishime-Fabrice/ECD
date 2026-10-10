import type { Metadata } from "next";
import { Backdrop } from "@/components/kid/Scene";
import { StickerGrid } from "@/components/StickerGrid";
import { TimeGate } from "@/components/TimesUp";
import { getStickerSlots } from "@/content";

export const metadata: Metadata = { title: "Stickers" };

export default function StickersPage() {
  return (
    <TimeGate mode="live">
      <div className="relative min-h-[calc(100dvh-5rem)] pb-44">
        <Backdrop scene="home-hills" />
        <StickerGrid slots={getStickerSlots()} />
      </div>
    </TimeGate>
  );
}
