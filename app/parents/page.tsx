import type { Metadata } from "next";
import { ParentPage } from "@/components/ParentArea";
import { getSeasons, getSite, getSkills } from "@/content";

export const metadata: Metadata = { title: "Parents" };

export default function ParentsPage() {
  return <ParentPage seasons={getSeasons()} skills={getSkills()} contact={getSite().contact} />;
}
