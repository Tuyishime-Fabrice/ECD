import type { Metadata } from "next";
import { FriendlyError } from "@/components/FriendlyError";

export const metadata: Metadata = { title: "Offline" };

/** Served by the service worker when a page isn't available offline. */
export default function OfflinePage() {
  return <FriendlyError offline />;
}
