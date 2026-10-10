import type { Metadata } from "next";
import { StoriesScreen } from "@/components/admin/StoriesScreen";

export const metadata: Metadata = { title: "Stories" };

export default function StoriesPage() {
  return <StoriesScreen />;
}
