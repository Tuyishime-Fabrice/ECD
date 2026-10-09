import type { Server } from "node:http";

export type FakeGitHub = {
  handle(request: Request): Promise<Response>;
  /** "METHOD /git/…" for every GitHub API request, in order. */
  log: string[];
  headSha(): string;
  readText(path: string, ref?: string): string | null;
  commitOnBranch(files: Record<string, string | Buffer | null>, message: string): string;
};

export function seedFromWorkingTree(root?: string): Record<string, Buffer>;

export function createFakeGitHub(options?: {
  files?: Record<string, Buffer | string>;
  token?: string;
  repo?: string;
  branch?: string;
}): FakeGitHub;

export function serveFakeGitHub(fake: FakeGitHub, port?: number, host?: string): Promise<Server>;
