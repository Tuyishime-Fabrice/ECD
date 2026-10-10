import { readAdminEnv } from "@/lib/admin/env";
import { isLoggedIn, json } from "@/lib/admin/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Open to everyone: the login and setup screens need it. It says what is missing, never any values. */
export async function GET(request: Request) {
  const env = readAdminEnv();
  return json({ loggedIn: isLoggedIn(request, env), setup: env.setup });
}
