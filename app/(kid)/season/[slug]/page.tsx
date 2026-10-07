import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeasonView } from "@/components/SeasonView";
import { TimeGate } from "@/components/TimesUp";
import { getPublishedSeasons, getSeason, getSeasons } from "@/content";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedSeasons().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const season = getSeason((await params).slug);
  return { title: season?.title.en };
}

export default async function SeasonPage({ params }: Props) {
  const season = getSeason((await params).slug);
  if (!season || season.status !== "published") notFound();
  return (
    <TimeGate mode="live">
      <SeasonView season={season} allSeasons={getSeasons()} />
    </TimeGate>
  );
}
