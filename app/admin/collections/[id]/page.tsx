import type { Metadata } from "next";
import { CollectionEditor } from "@/components/admin/CollectionEditor";

export const metadata: Metadata = { title: "Edit collection" };

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CollectionEditor key={id} id={decodeURIComponent(id)} />;
}
