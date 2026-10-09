/**
 * The admin login cookie: an HMAC-SHA256-signed `{exp}`, checked in constant time.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "izuba_admin";
export const SESSION_TTL_SEC = 7 * 24 * 60 * 60;

const MAC = /^[A-Za-z0-9_-]{43}$/;

const mac = (secret: string, payload: string) => createHmac("sha256", secret).update(payload).digest();

export function createSessionToken(secret: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + SESSION_TTL_SEC })).toString("base64url");
  return `${payload}.${mac(secret, payload).toString("base64url")}`;
}

export function verifySessionToken(secret: string, token: string | null | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined || !MAC.test(signature)) return false;
  // Compares the text, not decoded bytes: base64 has several spellings of the same bytes.
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(mac(secret, payload).toString("base64url")))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: unknown };
    return typeof exp === "number" && exp * 1000 > now;
  } catch {
    return false;
  }
}

/** Hashing first makes both sides the same length, so the comparison time says nothing about the password. */
export function passwordMatches(given: string, expected: string): boolean {
  const digest = (s: string) => createHash("sha256").update(s, "utf8").digest();
  return timingSafeEqual(digest(given), digest(expected));
}

export function sessionCookie(token: string, secure: boolean): string {
  return cookie(token, SESSION_TTL_SEC, secure);
}

export function clearedSessionCookie(secure: boolean): string {
  return cookie("", 0, secure);
}

function cookie(value: string, maxAge: number, secure: boolean): string {
  const parts = [`${SESSION_COOKIE}=${value}`, "Path=/", `Max-Age=${maxAge}`, "HttpOnly", "SameSite=Strict"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function readCookie(header: string | null, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}
