import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  clearedSessionCookie,
  createSessionToken,
  passwordMatches,
  readCookie,
  sessionCookie,
  SESSION_TTL_SEC,
  verifySessionToken,
} from "./session";

const SECRET = "a-test-secret-that-is-long-enough-123";
const NOW = Date.parse("2026-10-09T10:00:00Z");

describe("session token", () => {
  it("verifies a token it signed", () => {
    expect(verifySessionToken(SECRET, createSessionToken(SECRET, NOW), NOW)).toBe(true);
  });

  it("carries only an expiry, 7 days out", () => {
    const [payload] = createSessionToken(SECRET, NOW).split(".");
    expect(JSON.parse(Buffer.from(payload!, "base64url").toString())).toEqual({ exp: NOW / 1000 + SESSION_TTL_SEC });
  });

  it("expires after 7 days", () => {
    const token = createSessionToken(SECRET, NOW);
    expect(verifySessionToken(SECRET, token, NOW + SESSION_TTL_SEC * 1000 - 1)).toBe(true);
    expect(verifySessionToken(SECRET, token, NOW + SESSION_TTL_SEC * 1000)).toBe(false);
  });

  it("rejects a token signed with another secret (a changed password)", () => {
    expect(verifySessionToken(`${SECRET}x`, createSessionToken(SECRET, NOW), NOW)).toBe(false);
  });

  it("rejects a tampered expiry", () => {
    const [, signature] = createSessionToken(SECRET, NOW).split(".");
    const forged = Buffer.from(JSON.stringify({ exp: NOW / 1000 + 10 * 365 * 86400 })).toString("base64url");
    expect(verifySessionToken(SECRET, `${forged}.${signature}`, NOW)).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const token = createSessionToken(SECRET, NOW);
    const last = token.at(-1) === "A" ? "B" : "A";
    expect(verifySessionToken(SECRET, token.slice(0, -1) + last, NOW)).toBe(false);
  });

  it("rejects malformed values without throwing", () => {
    const token = createSessionToken(SECRET, NOW);
    for (const bad of [undefined, null, "", "abc", ".", `${token}.x`, token.split(".")[0], `x.${token.split(".")[1]}`, "e30.short"]) {
      expect(verifySessionToken(SECRET, bad, NOW)).toBe(false);
    }
  });

  it("rejects a correctly signed payload that has no number expiry", () => {
    const payload = Buffer.from(JSON.stringify({ exp: "never" })).toString("base64url");
    const signature = createHmac("sha256", SECRET).update(payload).digest("base64url");
    expect(verifySessionToken(SECRET, `${payload}.${signature}`, NOW)).toBe(false);
  });
});

describe("passwordMatches", () => {
  it("compares exactly", () => {
    expect(passwordMatches("correct horse battery", "correct horse battery")).toBe(true);
    expect(passwordMatches("correct horse batter", "correct horse battery")).toBe(false);
    expect(passwordMatches("", "correct horse battery")).toBe(false);
    expect(passwordMatches("Correct horse battery", "correct horse battery")).toBe(false);
  });
});

describe("cookies", () => {
  it("is HttpOnly, SameSite=Strict, 7 days, and Secure when asked", () => {
    expect(sessionCookie("v", true)).toBe("izuba_admin=v; Path=/; Max-Age=604800; HttpOnly; SameSite=Strict; Secure");
    expect(sessionCookie("v", false)).not.toContain("Secure");
    expect(clearedSessionCookie(true)).toBe("izuba_admin=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure");
  });

  it("reads one cookie from a Cookie header", () => {
    expect(readCookie("a=1; izuba_admin=x.y; b=2", "izuba_admin")).toBe("x.y");
    expect(readCookie("xizuba_admin=1", "izuba_admin")).toBeUndefined();
    expect(readCookie(null, "izuba_admin")).toBeUndefined();
  });
});
