import { failure, fail, gitHubFor, guard, json } from "@/lib/admin/http";
import { SEASONS_FILE, SITE_FILE } from "@/lib/admin/save";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = guard(request, { github: true });
  if (!auth.ok) return auth.response;
  try {
    const gh = gitHubFor(auth.env);
    const baseSha = await gh.headSha();
    // Read at the commit, not the branch, so both files come from the same version.
    const [seasons, site] = await Promise.all([gh.readFile(SEASONS_FILE, baseSha), gh.readFile(SITE_FILE, baseSha)]);
    if (!seasons || !site) return fail(500, `${seasons ? SITE_FILE : SEASONS_FILE} is missing from the repository.`);
    try {
      return json({ seasons: JSON.parse(seasons.text), site: JSON.parse(site.text), baseSha });
    } catch {
      return fail(500, "The stories files in the repository aren't valid JSON. Ask a developer to fix them.");
    }
  } catch (err) {
    return failure(err);
  }
}
