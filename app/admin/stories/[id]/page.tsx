import type { Metadata } from "next";
import { StoryEditor } from "@/components/admin/StoryEditor";

export const metadata: Metadata = { title: "Edit story" };

export default async function EditStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StoryEditor key={id} id={decodeURIComponent(id)} />;
}
