/**
 * Admin dashboard settings from environment variables (docs/ADMIN.md, "Setup").
 * Never throws: missing or broken values become plain-language `problems`, so
 * /admin can show a setup screen that names the variable instead of an error.
 */

export const DEFAULT_REPO = "Tuyishime-Fabrice/ECD";
export const DEFAULT_BRANCH = "main";
export const DEFAULT_API_URL = "https://api.github.com";
export const DEFAULT_OEMBED_URL = "https://www.youtube.com/oembed";
export const DEFAULT_THUMBNAIL_URL = "https://i.ytimg.com/vi";
export const MIN_PASSWORD_LENGTH = 12;
export const MIN_SECRET_LENGTH = 32;

export type GitHubSettings = { token: string; owner: string; repo: string; branch: string; apiUrl: string };

export type AdminEnv = {
  /** Set only when usable. */
  password: string | null;
  sessionSecret: string | null;
  github: GitHubSettings | null;
  youtube: { oembedUrl: string; thumbnailUrl: string };
  production: boolean;
  setup: { password: boolean; github: boolean; problems: string[] };
};

const WHERE = "Add it in Vercel → Project → Settings → Environment Variables, then redeploy.";
const REPO = /^([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)\/([A-Za-z0-9._-]+)$/;
const BRANCH = /^(?!-)(?!.*\.\.)(?!.*\/\/)[A-Za-z0-9._/-]+(?<![/.])$/;

function httpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href.replace(/\/+$/, "") : null;
  } catch {
    return null;
  }
}

export function readAdminEnv(env: Record<string, string | undefined> = process.env): AdminEnv {
  const problems: string[] = [];
  const value = (name: string) => {
    const v = env[name];
    return v && v.trim() ? v : undefined;
  };
  const setting = (name: string, fallback: string) => value(name)?.trim() ?? fallback;

  let password: string | null = null;
  const rawPassword = value("ADMIN_PASSWORD");
  if (!rawPassword) problems.push(`ADMIN_PASSWORD is not set. ${WHERE}`);
  else if (rawPassword.length < MIN_PASSWORD_LENGTH) {
    problems.push(`ADMIN_PASSWORD is too short. Use ${MIN_PASSWORD_LENGTH} or more characters, then redeploy.`);
  } else password = rawPassword;

  let sessionSecret: string | null = null;
  const rawSecret = value("ADMIN_SESSION_SECRET");
  if (rawSecret && rawSecret.length < MIN_SECRET_LENGTH) {
    problems.push(
      `ADMIN_SESSION_SECRET is too short. Use ${MIN_SECRET_LENGTH} or more random characters, or remove it, then redeploy.`,
    );
  } else if (password) {
    // Derived from the password by default, so changing the password signs everyone out.
    sessionSecret = rawSecret ?? `izuba-admin-session\n${password}`;
  }

  const token = value("GITHUB_TOKEN")?.trim();
  if (!token) problems.push(`GITHUB_TOKEN is not set. ${WHERE}`);

  const repoMatch = REPO.exec(setting("GITHUB_REPO", DEFAULT_REPO));
  if (!repoMatch) problems.push(`GITHUB_REPO must look like "owner/name", for example "${DEFAULT_REPO}".`);

  const branch = setting("GITHUB_BRANCH", DEFAULT_BRANCH);
  if (!BRANCH.test(branch)) problems.push(`GITHUB_BRANCH "${branch}" is not a valid branch name.`);

  const apiUrl = httpUrl(setting("GITHUB_API_URL", DEFAULT_API_URL));
  if (!apiUrl) problems.push("GITHUB_API_URL must be a web address starting with https://.");

  const oembedUrl = httpUrl(setting("YOUTUBE_OEMBED_URL", DEFAULT_OEMBED_URL));
  const thumbnailUrl = httpUrl(setting("YOUTUBE_THUMBNAIL_URL", DEFAULT_THUMBNAIL_URL));
  if (!oembedUrl) problems.push("YOUTUBE_OEMBED_URL must be a web address. Remove it to use YouTube.");
  if (!thumbnailUrl) problems.push("YOUTUBE_THUMBNAIL_URL must be a web address. Remove it to use YouTube.");

  const github =
    token && repoMatch && BRANCH.test(branch) && apiUrl
      ? { token, owner: repoMatch[1]!, repo: repoMatch[2]!, branch, apiUrl }
      : null;

  return {
    password: sessionSecret ? password : null,
    sessionSecret,
    github,
    youtube: { oembedUrl: oembedUrl ?? DEFAULT_OEMBED_URL, thumbnailUrl: thumbnailUrl ?? DEFAULT_THUMBNAIL_URL },
    production: env.NODE_ENV === "production",
    setup: { password: Boolean(sessionSecret), github: Boolean(github), problems },
  };
}
