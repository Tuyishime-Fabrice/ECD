import { describe, expect, it } from "vitest";
import { readAdminEnv } from "./env";

const ready = { ADMIN_PASSWORD: "correct horse battery", GITHUB_TOKEN: "github_pat_x" };

describe("readAdminEnv", () => {
  it("uses the documented defaults", () => {
    const env = readAdminEnv(ready);
    expect(env.github).toEqual({
      token: "github_pat_x",
      owner: "Tuyishime-Fabrice",
      repo: "ECD",
      branch: "main",
      apiUrl: "https://api.github.com",
    });
    expect(env.youtube).toEqual({ oembedUrl: "https://www.youtube.com/oembed", thumbnailUrl: "https://i.ytimg.com/vi" });
    expect(env.setup).toEqual({ password: true, github: true, problems: [] });
    expect(env.production).toBe(false);
  });

  it("derives the session secret from the password unless one is given", () => {
    expect(readAdminEnv(ready).sessionSecret).toContain(ready.ADMIN_PASSWORD);
    expect(readAdminEnv({ ...ready, ADMIN_PASSWORD: "another long password" }).sessionSecret).not.toBe(readAdminEnv(ready).sessionSecret);
    const secret = "s".repeat(32);
    expect(readAdminEnv({ ...ready, ADMIN_SESSION_SECRET: secret }).sessionSecret).toBe(secret);
  });

  it("reads overrides, trimming stray spaces and slashes", () => {
    const env = readAdminEnv({
      ...ready,
      GITHUB_TOKEN: " tok\n",
      GITHUB_REPO: "someone/my.repo",
      GITHUB_BRANCH: "release/v1",
      GITHUB_API_URL: "http://127.0.0.1:4010/",
    });
    expect(env.github).toEqual({ token: "tok", owner: "someone", repo: "my.repo", branch: "release/v1", apiUrl: "http://127.0.0.1:4010" });
  });

  it("names each missing or broken variable", () => {
    const env = readAdminEnv({ ADMIN_PASSWORD: "short", GITHUB_REPO: "not a repo", GITHUB_BRANCH: "-x", GITHUB_API_URL: "ftp://x", ADMIN_SESSION_SECRET: "tiny" });
    expect(env.setup.password).toBe(false);
    expect(env.setup.github).toBe(false);
    expect(env.password).toBeNull();
    expect(env.github).toBeNull();
    expect(env.setup.problems).toEqual([
      "ADMIN_PASSWORD is too short. Use 12 or more characters, then redeploy.",
      "ADMIN_SESSION_SECRET is too short. Use 32 or more random characters, or remove it, then redeploy.",
      expect.stringMatching(/^GITHUB_TOKEN is not set\. Add it in Vercel/),
      'GITHUB_REPO must look like "owner/name", for example "Tuyishime-Fabrice/ECD".',
      'GITHUB_BRANCH "-x" is not a valid branch name.',
      "GITHUB_API_URL must be a web address starting with https://.",
    ]);
  });

  it("treats blank values as missing", () => {
    expect(readAdminEnv({ ADMIN_PASSWORD: "   ", GITHUB_TOKEN: "" }).setup.problems.map((p) => p.split(" ")[0])).toEqual([
      "ADMIN_PASSWORD",
      "GITHUB_TOKEN",
    ]);
  });

  it("knows production", () => {
    expect(readAdminEnv({ ...ready, NODE_ENV: "production" }).production).toBe(true);
  });
});
