import { TopBar } from "@/components/TopBar";

export default function KidLayout({ children }: { children: React.ReactNode }) {
  return (
    // isolate: page scenery can sit behind the top bar with -z-10 without escaping the page.
    <div className="relative isolate flex min-h-dvh flex-col">
      <TopBar />
      <main id="main" className="flex-1 short:pb-3">
        {children}
      </main>
    </div>
  );
}
