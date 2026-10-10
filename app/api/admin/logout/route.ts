import { readAdminEnv } from "@/lib/admin/env";
import { checkSameOrigin, json, secureCookies } from "@/lib/admin/http";
import { clearedSessionCookie } from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Works without a valid session too, so an expired login can still be cleared. */
export async function POST(request: Request) {
  const denied = checkSameOrigin(request);
  if (denied) return denied;
  return json({ ok: true }, 200, { "Set-Cookie": clearedSessionCookie(secureCookies(request, readAdminEnv())) });
}
