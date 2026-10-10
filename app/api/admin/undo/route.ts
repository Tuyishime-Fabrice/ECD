import { failure, fail, gitHubFor, guard, json, readJson } from "@/lib/admin/http";
import { parseUndoRequest, undoSave } from "@/lib/admin/undo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = guard(request, { mutation: true, github: true });
  if (!auth.ok) return auth.response;
  const body = await readJson(request, 10_000);
  if (!body.ok) return body.response;
  const parsed = parseUndoRequest(body.value);
  if (!parsed.ok) return fail(400, parsed.error);
  try {
    const outcome = await undoSave(gitHubFor(auth.env), parsed.request);
    return json(outcome.body, outcome.status);
  } catch (err) {
    return failure(err);
  }
}
