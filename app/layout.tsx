import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";
import { AppEffects } from "@/components/AppEffects";
import { brand } from "@/lib/brand";
import "./globals.css";

// Lato, the typeface of the CED Imuhira logo, self-hosted by Next.js (no request to Google).
const lato = Lato({ subsets: ["latin"], weight: ["400", "700", "900"], variable: "--font-lato", display: "swap" });

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: brand.description,
  applicationName: brand.name,
  icons: { icon: brand.logo, apple: "/icons/apple-touch-icon.png" },
  // No external links, no tracking: keep crawlers from following anything.
  referrer: "strict-origin-when-cross-origin",
};

export const viewport: Viewport = {
  // Browser bar matches the page: cream in light mode, deep teal in dark mode.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf6ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1f1e" },
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
    <html lang="rw" className={lato.variable} suppressHydrationWarning>
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
