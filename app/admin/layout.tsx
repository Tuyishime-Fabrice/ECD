import type { Metadata, Viewport } from "next";
import { AdminApp } from "@/components/admin/AdminApp";
import { brand } from "@/lib/brand";
import "./admin.css";

// Rendered for every request and never cached: a cached /admin could show stories
// from before the latest save (docs/ADMIN.md, "Security").
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: `${brand.name} Admin`, template: `%s · ${brand.name} Admin` },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // The browser bar matches the dashboard's paper top bar.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffdf8" },
    { media: "(prefers-color-scheme: dark)", color: "#1f2546" },
  ],
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminApp>{children}</AdminApp>;
}
