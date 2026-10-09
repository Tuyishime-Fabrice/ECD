/**
 * The dashboard's only way to the server: /api/admin/* (docs/ADMIN.md, "Admin API")
 * and the /build-info.json the build writes. Never throws; every failure comes back
 * as { ok: false } with a sentence the person can act on.
 */
import type { Content } from "@/content/schema";
import type { Site } from "@/content/site";
import type { Issue } from "@/lib/admin/ui-issues";

export type SetupInfo = { password: boolean; github: boolean; problems: string[] };
export type SessionInfo = { loggedIn: boolean; setup: SetupInfo };
export type ContentInfo = { seasons: Content; site: Site; baseSha: string };
export type VideoInfo = { id: string; title: string; thumbnail: { base64: string; type: string } | null };
export type HistoryEntry = { sha: string; summary: string; date: string };
export type SaveBody = {
  seasons: Content;
  site: Site;
  uploads: { path: string; base64: string }[];
  summary: string;
  baseSha: string;
};

export type ApiFailure = { ok: false; status: number; error: string; errors: string[]; issues: Issue[] };
export type ApiResult<T> = { ok: true; status: number; data: T } | ApiFailure;

const OFFLINE = "Couldn't reach the dashboard. Check the internet connection and try again.";

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

async function call<T>(path: string, json?: unknown): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`/api/admin/${path}`, {
      method: json === undefined ? "GET" : "POST",
      headers: json === undefined ? undefined : { "Content-Type": "application/json" },
      body: json === undefined ? undefined : JSON.stringify(json),
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    return { ok: false, status: 0, error: OFFLINE, errors: [], issues: [] };
  }
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (res.ok && body) return { ok: true, status: res.status, data: body as T };
  const errors = strings(body?.errors);
  const issues = Array.isArray(body?.issues) ? (body.issues as Issue[]) : [];
  const error =
    typeof body?.error === "string"
      ? body.error
      : (errors[0] ?? `Something went wrong (error ${res.status}). Try again in a minute.`);
  return { ok: false, status: res.status, error, errors, issues };
}

export const api = {
  session: () => call<SessionInfo>("session"),
  login: (password: string) => call<{ ok: true }>("login", { password }),
  logout: () => call<{ ok: true }>("logout", {}),
  content: () => call<ContentInfo>("content"),
  save: (body: SaveBody) => call<{ commitSha: string; unchanged?: boolean }>("save", body),
  youtube: (link: string) => call<VideoInfo>(`youtube?url=${encodeURIComponent(link)}`),
  history: () => call<{ commits: HistoryEntry[] }>("history"),
  undo: (sha: string, baseSha: string) => call<{ commitSha: string }>("undo", { sha, baseSha }),
};

/** The commit the running app was built from; null when unknown (no build info, or offline). */
export async function deployedSha(): Promise<string | null> {
  try {
    const res = await fetch("/build-info.json", { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { sha?: unknown };
    return typeof body.sha === "string" ? body.sha : null;
  } catch {
    return null;
  }
}
