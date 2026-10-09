import { failure, fail, guard, json } from "@/lib/admin/http";
import { lookupVideo, NOT_A_LINK, YouTubeError } from "@/lib/admin/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  const auth = guard(request);
  if (!auth.ok) return auth.response;
  const link = new URL(request.url).searchParams.get("url");
  if (!link?.trim()) return fail(400, NOT_A_LINK);
  try {
    return json(await lookupVideo(link, auth.env.youtube));
  } catch (err) {
    if (err instanceof YouTubeError) return fail(err.status, err.message);
    return failure(err);
  }
}
