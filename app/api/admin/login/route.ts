import { readAdminEnv } from "@/lib/admin/env";
import { checkSameOrigin, fail, json, notSetUp, readJson, secureCookies } from "@/lib/admin/http";
import { clientAddress, loginLimiter, waitInWords } from "@/lib/admin/login-limit";
import { createSessionToken, passwordMatches, sessionCookie } from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WRONG_PASSWORD_DELAY_MS = 800;

export async function POST(request: Request) {
  const denied = checkSameOrigin(request);
  if (denied) return denied;
  const env = readAdminEnv();
  if (!env.password || !env.sessionSecret) return notSetUp(env);
  const body = await readJson(request, 10_000);
  if (!body.ok) return body.response;
  const password = (body.value as { password?: unknown } | null)?.password;
  // Checked and counted together, with no await between, so a burst of parallel guesses can't slip past.
  const client = clientAddress(request);
  const waitMs = loginLimiter.retryAfter(client);
  if (waitMs > 0) {
    return json(
      { error: `Too many wrong passwords. For safety, signing in is paused for ${waitInWords(waitMs)}. Try again after that.` },
      429,
      { "Retry-After": String(Math.ceil(waitMs / 1000)) },
    );
  }
  if (typeof password !== "string" || !passwordMatches(password, env.password)) {
    loginLimiter.failed(client);
    // Slows down guessing; there is no account to lock.
    await new Promise((resolve) => setTimeout(resolve, WRONG_PASSWORD_DELAY_MS));
    return fail(401, "That password isn't right. Try again.");
  }
  loginLimiter.succeeded(client);
  const cookie = sessionCookie(createSessionToken(env.sessionSecret), secureCookies(request, env));
  return json({ ok: true }, 200, { "Set-Cookie": cookie });
}
