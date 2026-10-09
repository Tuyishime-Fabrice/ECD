import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChallengeFlow } from "@/components/ChallengeFlow";
import { Backdrop } from "@/components/kid/Scene";
import { TimeGate } from "@/components/TimesUp";
import { getChallenge, getChallengeIds, getSeasons } from "@/content";

type Props = { params: Promise<{ challengeId: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getChallengeIds().map((challengeId) => ({ challengeId }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = getChallenge((await params).challengeId);
  return { title: data?.challenge.title.en };
}

export default async function ChallengePage({ params }: Props) {
  const data = getChallenge((await params).challengeId);
  if (!data) notFound();
  return (
    <TimeGate mode="start">
      <div className="relative min-h-[calc(100dvh-5rem)] pb-48 short:min-h-0 short:pb-2">
        <Backdrop scene="quiz-hill" sceneClassName="h-56 object-[50%_0%] md:h-72" />
        <ChallengeFlow challenge={data.challenge} seasons={getSeasons()} />
      </div>
    </TimeGate>
  );
}
