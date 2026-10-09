"use client";

/**
 * The /admin entry: checks the session, then shows the setup steps, the sign-in
 * screen, or the dashboard.
 */
import { Eye, EyeOff, LoaderCircle, RefreshCw, Settings, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { brand } from "@/lib/brand";
import { AdminProvider, useAdmin } from "./AdminProvider";
import { BrandMark, Shell } from "./Shell";
import { Alert, Button, Field, ICON, TextInput } from "./ui";

export function AdminApp({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // The kid app sets the page language from the child's setting; the dashboard is in English.
    document.documentElement.lang = "en";
  }, []);
  return (
    <div lang="en" className="admin-root min-h-dvh bg-paper-2 font-body text-base text-ink">
      <AdminProvider>
        <Gate>{children}</Gate>
      </AdminProvider>
    </div>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const { phase } = useAdmin();
  switch (phase) {
    case "checking":
      return (
        <Frame>
          <div className="flex items-center justify-center gap-3 py-10 text-ink-2" role="status">
            <LoaderCircle className="size-5 animate-spin" {...ICON} />
            <span className="font-semibold">Opening the dashboard…</span>
          </div>
        </Frame>
      );
    case "setup":
      return <SetupScreen />;
    case "signed-out":
      return <LoginScreen />;
    case "error":
      return <ErrorScreen />;
    default:
      return <Shell>{children}</Shell>;
  }
}

/** Sign-in and setup: one card in the middle, with the app's hills along the bottom. */
function Frame({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col items-center overflow-hidden px-4 pb-40 pt-10 sm:justify-center sm:pt-16">
      <picture className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 block h-44 sm:h-56">
        <source media="(prefers-color-scheme: dark)" srcSet="/images/world/home-hills-night.svg" />
        <img src="/images/world/home-hills-day.svg" alt="" className="size-full object-cover object-bottom opacity-90" />
      </picture>
      <div className={wide ? "w-full max-w-xl" : "w-full max-w-[25rem]"}>
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>
        <div className="rounded-2xl border border-line bg-paper p-6 shadow-e2 sm:p-8">{children}</div>
      </div>
    </div>
  );
}

function LoginScreen() {
  const { signIn, signedOutWithChanges } = useAdmin();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const previous = document.title;
    document.title = `Sign in · ${brand.name} Admin`;
    input.current?.focus();
    return () => {
      document.title = previous;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setError("Enter the password.");
      input.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    const problem = await signIn(password);
    setBusy(false);
    if (problem) {
      setError(problem);
      input.current?.select();
    }
  }

  return (
    <Frame>
      <h1 className="font-display text-2xl font-bold text-ink">Sign in</h1>
      <p className="mt-1 text-[15px] text-ink-2">Manage the stories children watch in {brand.name}.</p>
      {signedOutWithChanges && (
        <Alert tone="info" className="mt-5" title="You were signed out">
          Your changes are still here. Sign in again to save them.
        </Alert>
      )}
      <form onSubmit={submit} noValidate className="mt-6 space-y-5">
        <Field field="password" label="Password" errors={error ? [error] : undefined}>
          {(control) => (
            <div className="relative">
              <TextInput
                {...control}
                ref={input}
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide the password" : "Show the password"}
                aria-pressed={show}
                className="absolute right-0 top-0 grid size-11 place-items-center rounded-r-xl text-ink-3 hover:text-ink"
              >
                {show ? <EyeOff className="size-5" {...ICON} /> : <Eye className="size-5" {...ICON} />}
              </button>
            </div>
          )}
        </Field>
        <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 border-t border-line pt-4 text-sm text-ink-2">
        Forgot the password? Ask the person who set up {brand.name}. It is kept in the hosting settings, as
        ADMIN_PASSWORD.
      </p>
    </Frame>
  );
}

const SETTINGS = [
  { name: "ADMIN_PASSWORD", what: "The password for this dashboard. Use 12 or more characters." },
  {
    name: "GITHUB_TOKEN",
    what: "Lets the dashboard save stories. Make it on GitHub (Settings → Developer settings → Fine-grained tokens) for this project only, with Contents: Read and write.",
  },
];

function SetupScreen() {
  const { session, recheck } = useAdmin();
  const [busy, setBusy] = useState(false);
  const problems = session?.setup.problems ?? [];
  // Only the settings that are missing or wrong; all of them if the problem is elsewhere.
  const named = SETTINGS.filter((s) => problems.some((p) => p.includes(s.name)));
  const settings = named.length ? named : SETTINGS;
  useEffect(() => {
    const previous = document.title;
    document.title = `Finish setting up · ${brand.name} Admin`;
    return () => {
      document.title = previous;
    };
  }, []);
  return (
    <Frame wide>
      <span className="grid size-11 place-items-center rounded-xl bg-listen/12 text-listen-ink">
        <Settings className="size-6" {...ICON} />
      </span>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink">Finish setting up the dashboard</h1>
      <p className="mt-1 text-[15px] text-ink-2">
        The dashboard needs a few settings before anyone can sign in. This is done once, by the person who
        manages the hosting (Vercel).
      </p>
      {problems.length > 0 && (
        <Alert tone="warn" className="mt-5" title="What's missing">
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Alert>
      )}
      <ol className="mt-6 space-y-5">
        <Step n={1} title="Open the project's settings">
          In Vercel, open the {brand.name} project, then <b>Settings</b> → <b>Environment Variables</b>.
        </Step>
        <Step n={2} title="Add each missing setting">
          <ul className="mt-2 space-y-2">
            {settings.map((s) => (
              <li key={s.name} className="rounded-xl border border-line bg-paper-2 px-3.5 py-3">
                <code className="font-mono text-[14px] font-bold text-ink">{s.name}</code>
                <p className="mt-0.5 text-sm text-ink-2">{s.what}</p>
              </li>
            ))}
          </ul>
        </Step>
        <Step n={3} title="Restart the app with the new settings">
          Open <b>Deployments</b>, press <b>⋯</b> next to the newest one and choose <b>Redeploy</b>. It takes about 2
          minutes.
        </Step>
        <Step n={4} title="Come back here">Then press the button below.</Step>
      </ol>
      <Button
        variant="primary"
        size="lg"
        className="mt-7 w-full sm:w-auto"
        icon={<RefreshCw className="size-[18px]" {...ICON} />}
        loading={busy}
        onClick={async () => {
          setBusy(true);
          await recheck();
          setBusy(false);
        }}
      >
        Check again
      </Button>
    </Frame>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-listen-lip font-display text-sm font-bold text-white">
        {n}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="font-bold text-ink">{title}</p>
        <div className="mt-0.5 text-[15px] text-ink-2">{children}</div>
      </div>
    </li>
  );
}

function ErrorScreen() {
  const { loadError, recheck } = useAdmin();
  const [busy, setBusy] = useState(false);
  return (
    <Frame>
      <span className="grid size-11 place-items-center rounded-xl bg-coral-soft text-play-ink">
        <TriangleAlert className="size-6" {...ICON} />
      </span>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink">The dashboard didn&apos;t open</h1>
      <p className="mt-1 text-[15px] text-ink-2">{loadError || "Something went wrong."}</p>
      <Button
        variant="primary"
        size="lg"
        className="mt-6 w-full"
        icon={<RefreshCw className="size-[18px]" {...ICON} />}
        loading={busy}
        onClick={async () => {
          setBusy(true);
          await recheck();
          setBusy(false);
        }}
      >
        Try again
      </Button>
    </Frame>
  );
}
