import type { Metadata } from "next";
import { ChallengesScreen } from "@/components/admin/ChallengesScreen";

export const metadata: Metadata = { title: "Challenges" };

export default function ChallengesPage() {
  return <ChallengesScreen />;
}
