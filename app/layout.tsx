import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { brand } from "@/lib/brand";
import "./globals.css";

// Both are variable fonts, so one self-hosted file each covers every weight.
const baloo = Baloo_2({ subsets: ["latin"], variable: "--font-baloo", display: "swap" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: brand.tagline.en,
  applicationName: brand.name,
  icons: { icon: brand.logo },
};

export const viewport: Viewport = {
  themeColor: brand.themeColor,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="rw" className={`${baloo.variable} ${nunito.variable}`}>
      <body>{children}</body>
    </html>
  );
}
