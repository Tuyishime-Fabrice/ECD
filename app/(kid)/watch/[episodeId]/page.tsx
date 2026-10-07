import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WatchView } from "@/components/WatchView";
import { getEpisode, getEpisodeIds, getSeasons } from "@/content";

type Props = { params: Promise<{ episodeId: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getEpisodeIds().map((episodeId) => ({ episodeId }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = getEpisode((await params).episodeId);
  return { title: data?.episode.title.en };
}

export default async function WatchPage({ params }: Props) {
  const data = getEpisode((await params).episodeId);
  if (!data) notFound();
  return <WatchView episode={data.episode} seasons={getSeasons()} />;
}
