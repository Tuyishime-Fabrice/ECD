import { failure, gitHubFor, guard, json } from "@/lib/admin/http";
import { CONTENT_FILES, UPLOADS_FOLDER } from "@/lib/admin/save";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HISTORY_LENGTH = 30;

export async function GET(request: Request) {
  const auth = guard(request, { github: true });
  if (!auth.ok) return auth.response;
  try {
    const commits = await gitHubFor(auth.env).recentCommits([...CONTENT_FILES, UPLOADS_FOLDER], HISTORY_LENGTH);
    return json({ commits });
  } catch (err) {
    return failure(err);
  }
}
