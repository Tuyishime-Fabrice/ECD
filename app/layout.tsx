import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { AppEffects } from "@/components/AppEffects";
import { brand } from "@/lib/brand";
import "./globals.css";

// Both are variable fonts, so one self-hosted file each covers every weight.
const baloo = Baloo_2({ subsets: ["latin"], variable: "--font-baloo", display: "swap" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: brand.tagline.en,
  applicationName: brand.name,
  icons: { icon: brand.logo, apple: "/icons/apple-touch-icon.png" },
  // No external links, no tracking: keep crawlers from following anything.
  referrer: "strict-origin-when-cross-origin",
};

export const viewport: Viewport = {
  // Browser bar matches the sky: morning in light mode, night in dark mode.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#9fd6f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1533" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Sets <html lang> from the saved language before first paint (screen readers, hyphenation).
const langScript = `try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  `${brand.storagePrefix}settings`,
)})||"{}");if(s.language==="en"||s.language==="rw")document.documentElement.lang=s.language}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="rw" className={`${baloo.variable} ${nunito.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: langScript }} />
      </head>
      <body>
        <AppEffects />
        {children}
      </body>
    </html>
  );
}
