import { TopBar } from "@/components/TopBar";

export default function KidLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col">
      <TopBar />
      <main id="main" className="flex-1 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
