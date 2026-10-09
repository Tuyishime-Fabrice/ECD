import type { Metadata } from "next";
import { HelpScreen } from "@/components/admin/HelpScreen";

export const metadata: Metadata = { title: "Help" };

export default function HelpPage() {
  return <HelpScreen />;
}
