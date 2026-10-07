import type { Metadata } from "next";
import { ParentPage } from "@/components/ParentArea";
import { getSeasons, getSkills } from "@/content";

export const metadata: Metadata = { title: "Parents" };

export default function ParentsPage() {
  return <ParentPage seasons={getSeasons()} skills={getSkills()} />;
}
