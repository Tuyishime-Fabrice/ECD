import type { Metadata } from "next";
import { StoryEditor } from "@/components/admin/StoryEditor";

export const metadata: Metadata = { title: "Add a story" };

export default async function NewStoryPage({ searchParams }: { searchParams: Promise<{ collection?: string }> }) {
  const { collection } = await searchParams;
  return <StoryEditor collection={typeof collection === "string" ? collection : undefined} />;
}
