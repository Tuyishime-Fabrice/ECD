import type { Metadata } from "next";
import { ChallengeEditor } from "@/components/admin/ChallengeEditor";

export const metadata: Metadata = { title: "Edit challenge" };

export default async function EditChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChallengeEditor key={id} id={decodeURIComponent(id)} />;
}
