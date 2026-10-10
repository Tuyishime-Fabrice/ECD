import type { Metadata } from "next";
import { CollectionsScreen } from "@/components/admin/CollectionsScreen";

export const metadata: Metadata = { title: "Collections" };

export default function CollectionsPage() {
  return <CollectionsScreen />;
}
