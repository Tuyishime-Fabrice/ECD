/**
 * Shared plumbing for the /api/admin route handlers: never-cached JSON replies,
 * the session and same-origin checks, and plain-language GitHub failures.
 */
import { readAdminEnv, type AdminEnv } from "./env";
import { createGitHub, GitHubError, type GitHub } from "./github";
import { readCookie, SESSION_COOKIE, verifySessionToken } from "./session";

/** Vercel refuses bigger request bodies before our code runs; matching it locally keeps behaviour the same. */
export const MAX_BODY_BYTES = 4.5 * 1024 * 1024;

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...headers, "Cache-Control": "no-store" } });
}

export const fail = (status: number, error: string) => json({ error }, status);

/** The host the browser talked to (Vercel and most proxies pass it on as x-forwarded-host). */
export function requestHost(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  return (forwarded || request.headers.get("host") || new URL(request.url).host).toLowerCase();
}

/** Secure cookies everywhere in production except plain-http localhost (`next start` while testing). */
export function secureCookies(request: Request, env: AdminEnv): boolean {
  const hostname = requestHost(request).replace(/:\d+$/, "");
  return env.production && !["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}

/**
 * Against cross-site requests: browsers always send Origin on POSTs, and a JSON
 * body can't be sent cross-site without a CORS preflight, which we never allow.
 */
export function checkSameOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  let originHost = "";
  try {
    originHost = origin ? new URL(origin).host.toLowerCase() : "";
  } catch {
    // Treated as missing.
  }
  if (!originHost || originHost !== requestHost(request)) {
    return fail(403, "This request didn't come from the dashboard. Open the dashboard and try again.");
  }
  if (!/^application\/json\s*(;|$)/i.test(request.headers.get("content-type") ?? "")) {
    return fail(415, "Send the data as JSON (Content-Type: application/json).");
  }
  return null;
}

export const isLoggedIn = (request: Request, env: AdminEnv) =>
  Boolean(env.sessionSecret) &&
  verifySessionToken(env.sessionSecret!, readCookie(request.headers.get("cookie"), SESSION_COOKIE));

export const notSetUp = (env: AdminEnv) =>
  fail(503, `The dashboard isn't set up yet. ${env.setup.problems.join(" ")}`.trim());

type Guarded = { ok: true; env: AdminEnv } | { ok: false; response: Response };

/**
 * Every route but login: the session must be valid. State-changing routes also
 * need same-origin JSON. Routes that use GitHub need it configured.
 */
export function guard(request: Request, options: { mutation?: boolean; github?: boolean } = {}): Guarded {
  const env = readAdminEnv();
  const deny = (response: Response) => ({ ok: false as const, response });
  if (options.mutation) {
    const denied = checkSameOrigin(request);
    if (denied) return deny(denied);
  }
  if (!env.setup.password) return deny(notSetUp(env));
  if (!isLoggedIn(request, env)) return deny(fail(401, "Please sign in again."));
  if (options.github && !env.github) return deny(notSetUp(env));
  return { ok: true, env };
}

export function gitHubFor(env: AdminEnv): GitHub {
  if (!env.github) throw new Error("GitHub is not configured");
  return createGitHub(env.github);
}

export async function readJson(
  request: Request,
  maxBytes = MAX_BODY_BYTES,
): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  const tooBig = () => ({
    ok: false as const,
    response: fail(413, "This save is too big. Save fewer or smaller pictures at a time."),
  });
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) return tooBig();
  const text = await request.text();
  if (text.length > maxBytes) return tooBig();
  try {
    return { ok: true, value: text ? JSON.parse(text) : {} };
  } catch {
    return { ok: false, response: fail(400, "The data sent wasn't valid JSON.") };
  }
}

/** A GitHub (or unexpected) failure, in words the owner can act on. */
export function failure(err: unknown): Response {
  if (err instanceof GitHubError) {
    console.error(`[admin] ${err.message}`);
    if (err.status === 0) return fail(502, "Couldn't reach GitHub. Check the internet connection and try again.");
    if (err.rateLimited) return fail(503, "GitHub is busy right now. Wait a minute and try again.");
    if (err.status === 401) {
      return fail(
        502,
        "GitHub didn't accept the token. It may have expired: make a new one, put it in GITHUB_TOKEN in Vercel and redeploy.",
      );
    }
    if (err.status === 403) {
      return fail(502, "The GitHub token isn't allowed to change this repository. It needs Contents: Read and write.");
    }
    if (err.status === 404) {
      return fail(
        502,
        "Couldn't find the repository or branch on GitHub. Check GITHUB_REPO and GITHUB_BRANCH, and that the token can see this repository.",
      );
    }
    return fail(502, "GitHub had a problem. Try again in a minute.");
  }
  console.error("[admin]", err);
  return fail(500, "Something went wrong on the server. Try again; if it keeps happening, ask for help.");
}
