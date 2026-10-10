import type { Metadata } from "next";
import { FriendlyError } from "@/components/FriendlyError";
import { Backdrop } from "@/components/kid/Scene";

export const metadata: Metadata = { title: "Offline" };

/** Served by the service worker when a page isn't available offline. */
export default function OfflinePage() {
  return (
    <div className="relative min-h-[calc(100dvh-5rem)] pb-44">
      <Backdrop scene="home-hills" />
      <FriendlyError offline />
    </div>
  );
}
