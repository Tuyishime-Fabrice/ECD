import type { Metadata } from "next";
import { ChallengeEditor } from "@/components/admin/ChallengeEditor";

export const metadata: Metadata = { title: "Add a challenge" };

export default async function NewChallengePage({ searchParams }: { searchParams: Promise<{ collection?: string }> }) {
  const { collection } = await searchParams;
  return <ChallengeEditor collection={typeof collection === "string" ? collection : undefined} />;
}
