/**
 * Saving from the dashboard: run the same checks as the build (validateContent,
 * validateSite) plus the picture checks, then make one commit. A save that would
 * break the build is refused with plain-language reasons.
 */
import { siteSchema, validateSite, type SiteIssue } from "@/content/site";
import { validateContent } from "@/content/validate";
import { BranchMovedError, gitBlobSha, type DirEntry, type GitHub, type NewFile, type TreeEntry } from "./github";
import {
  base64Size,
  decodeBase64,
  extensionType,
  IMAGE_TYPES,
  MAX_SAVE_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES,
  MAX_UPLOADS_PER_SAVE,
  megabytes,
  normalizeUploadPath,
  sniffImage,
  UPLOAD_DIR,
} from "./uploads";
import { plainMessage, plainSiteError, whereInContent } from "./wording";

export const SEASONS_FILE = "content/seasons.json";
export const SITE_FILE = "content/site.json";
export const CONTENT_FILES = [SEASONS_FILE, SITE_FILE] as const;
export const UPLOADS_FOLDER = "public/images/uploads";
export const CONFLICT_MESSAGE = "Someone else saved changes. Reload to see them.";

export type Upload = { path: string; base64: string };
export type SaveRequest = { seasons: unknown; site: unknown; uploads: Upload[]; summary: string; baseSha: string };
/** `message` is the whole sentence (also in `errors`); `problem` is the part to show next to the field. */
export type Issue = {
  file: "seasons" | "site" | "uploads";
  path: (string | number)[];
  message: string;
  problem: string;
};
export type Checked = { ok: true; files: NewFile[] } | { ok: false; errors: string[]; issues: Issue[] };
export type Outcome = { status: number; body: Record<string, unknown> };

export const SHA = /^[0-9a-f]{40}$/;
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isUpload = (u: unknown) => isObject(u) && typeof u.path === "string" && typeof u.base64 === "string";

export function parseSaveRequest(body: unknown): { ok: true; request: SaveRequest } | { ok: false; error: string } {
  const fail = (error: string) => ({ ok: false as const, error });
  if (!isObject(body)) return fail("Send { seasons, site, uploads, summary, baseSha }.");
  if (!isObject(body.seasons)) return fail("The stories (seasons) are missing from the save.");
  if (!isObject(body.site)) return fail("The settings (site) are missing from the save.");
  if (typeof body.baseSha !== "string" || !SHA.test(body.baseSha)) {
    return fail("The save doesn't say which version it started from (baseSha). Reload and try again.");
  }
  const uploads = body.uploads ?? [];
  if (!Array.isArray(uploads) || !uploads.every(isUpload)) {
    return fail("Each picture needs a path and its base64 data.");
  }
  if (body.summary !== undefined && typeof body.summary !== "string") return fail("The summary must be text.");
  const summary = body.summary ?? "";
  return { ok: true, request: { seasons: body.seasons, site: body.site, uploads, summary, baseSha: body.baseSha } };
}

export type CheckedUpload = { publicPath: string; repoPath: string; bytes: Uint8Array };

/**
 * @param repoFiles blob sha by path ("public/images/…") for every file in the repository
 */
export function checkUploads(uploads: Upload[], repoFiles: ReadonlyMap<string, string>) {
  const files: CheckedUpload[] = [];
  const issues: Issue[] = [];
  const problem = (path: (string | number)[], text: string) =>
    issues.push({ file: "uploads", path, message: text, problem: text });
  if (uploads.length > MAX_UPLOADS_PER_SAVE) {
    const count = `This save has ${uploads.length} new pictures; one save can carry up to ${MAX_UPLOADS_PER_SAVE}.`;
    problem([], `${count} Save fewer at a time.`);
    return { files, issues };
  }
  const seen = new Set<string>();
  let total = 0;
  uploads.forEach((upload, i) => {
    const publicPath = normalizeUploadPath(upload.path);
    if (!publicPath) {
      const shown = upload.path.length > 60 ? `${upload.path.slice(0, 57)}…` : upload.path;
      const rule = `Pictures are saved in ${UPLOAD_DIR} with a name made of lowercase letters, numbers and "-".`;
      return problem([i], `Picture "${shown}": this file name can't be used. ${rule}`);
    }
    const name = publicPath.slice(UPLOAD_DIR.length);
    if (seen.has(publicPath)) return problem([i], `Picture "${name}" was added twice.`);
    seen.add(publicPath);
    const tooBig = (size: number) =>
      problem([i], `Picture "${name}" is too big (${megabytes(size)}). Pictures can be up to ${megabytes(MAX_UPLOAD_BYTES)}.`);
    // Checked before decoding so a huge upload is never copied in memory.
    if (base64Size(upload.base64) > MAX_UPLOAD_BYTES + 3) return tooBig(base64Size(upload.base64));
    const bytes = decodeBase64(upload.base64);
    if (!bytes) return problem([i], `Picture "${name}" couldn't be read. Add it again.`);
    if (bytes.length > MAX_UPLOAD_BYTES) return tooBig(bytes.length);
    const type = sniffImage(bytes);
    if (!type) return problem([i], `Picture "${name}" isn't a JPEG, PNG or WebP picture.`);
    if (extensionType(publicPath) !== type) {
      const { label, extensions } = IMAGE_TYPES[type];
      return problem([i], `Picture "${name}" is a ${label} picture, but its name doesn't end in ".${extensions[0]}".`);
    }
    const repoPath = `public${publicPath}`;
    const existing = repoFiles.get(repoPath);
    if (existing && existing !== gitBlobSha(bytes)) {
      return problem([i], `A different picture is already saved as "${name}". Add it again under a new name.`);
    }
    total += bytes.length;
    files.push({ publicPath, repoPath, bytes });
  });
  if (total > MAX_SAVE_UPLOAD_BYTES) {
    const sizes = `The new pictures add up to ${megabytes(total)}; one save can carry up to ${megabytes(MAX_SAVE_UPLOAD_BYTES)}.`;
    problem([], `${sizes} Save fewer pictures at a time.`);
  }
  return { files, issues };
}

const jsonBytes = (value: unknown) => new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`);

/**
 * Everything the build checks, against the repository as it is now plus the
 * pictures in this save. On success, `files` holds only what actually changes.
 */
export function checkSave(
  request: Pick<SaveRequest, "seasons" | "site" | "uploads">,
  repoFiles: ReadonlyMap<string, string>,
): Checked {
  const uploads = checkUploads(request.uploads, repoFiles);
  const uploaded = new Set(uploads.files.map((f) => f.publicPath));
  const fileExists = (publicPath: string) => uploaded.has(publicPath) || repoFiles.has(`public${publicPath}`);
  const issues: Issue[] = [...uploads.issues];

  const content = validateContent(request.seasons, fileExists);
  if (!content.ok) {
    for (const { path, message, missingPicture } of content.issues) {
      const problem = plainMessage({ message, missingPicture });
      issues.push({ file: "seasons", path, message: `${whereInContent(request.seasons, path)}: ${problem}`, problem });
    }
  }

  // Featured stories can only be checked against valid stories; otherwise check the shape alone.
  let siteIssues: SiteIssue[] = [];
  if (content.ok) {
    const site = validateSite(request.site, content.content);
    if (!site.ok) siteIssues = site.issues;
  } else {
    const shape = siteSchema.safeParse(request.site);
    if (!shape.success) {
      siteIssues = shape.error.issues.map((i) => ({
        path: i.path.map((k) => (typeof k === "number" ? k : String(k))),
        message: i.message,
      }));
    }
  }
  for (const issue of siteIssues) {
    const message = plainSiteError(issue, request.seasons);
    issues.push({ file: "site", path: issue.path, message, problem: message.slice(message.indexOf(": ") + 2) });
  }

  if (issues.length) return { ok: false, errors: issues.map((i) => i.message), issues };
  const files = [
    { path: SEASONS_FILE, bytes: jsonBytes(request.seasons) },
    { path: SITE_FILE, bytes: jsonBytes(request.site) },
    ...uploads.files.map((f) => ({ path: f.repoPath, bytes: f.bytes })),
  ].filter((f) => repoFiles.get(f.path) !== gitBlobSha(f.bytes));
  return { ok: true, files };
}

/** True when content/seasons.json or content/site.json differs between two listings of content/. */
export function contentChanged(before: DirEntry[], after: DirEntry[]): boolean {
  const sha = (list: DirEntry[], path: string) => list.find((e) => e.path === path)?.sha;
  return CONTENT_FILES.some((path) => sha(before, path) !== sha(after, path));
}

/** Did someone else change the content files since the dashboard loaded them at `baseSha`? */
export async function contentMovedSince(gh: GitHub, baseSha: string, headSha: string): Promise<boolean> {
  if (baseSha === headSha) return false;
  const [before, after] = await Promise.all([gh.listDir("content", baseSha), gh.listDir("content", headSha)]);
  return !before || !after || contentChanged(before, after);
}

export const blobShas = (tree: TreeEntry[]) =>
  new Map(tree.filter((e) => e.type === "blob").map((e) => [e.path, e.sha] as const));

export const conflict = (): Outcome => ({ status: 409, body: { error: CONFLICT_MESSAGE } });

export function commitMessage(summary: string): string {
  const line = summary.replace(/\s+/g, " ").trim().slice(0, 100);
  return `${line || "Update stories"}\n\nSaved from the admin dashboard.`;
}

/**
 * Validates and commits one save. If the branch moves while committing (someone
 * else's commit lands in between), it starts over once on top of the new head.
 */
export async function saveContent(gh: GitHub, request: SaveRequest): Promise<Outcome> {
  for (let attempt = 1; ; attempt++) {
    const head = await gh.headCommit();
    if (await contentMovedSince(gh, request.baseSha, head.sha)) return conflict();
    const checked = checkSave(request, blobShas(await gh.tree(head.treeSha)));
    if (!checked.ok) return { status: 422, body: { errors: checked.errors, issues: checked.issues } };
    try {
      const sha = await gh.commitFiles({ parent: head, files: checked.files, message: commitMessage(request.summary) });
      return { status: 200, body: sha ? { commitSha: sha } : { commitSha: head.sha, unchanged: true } };
    } catch (err) {
      if (!(err instanceof BranchMovedError)) throw err;
      if (attempt >= 2) return conflict();
    }
  }
}
