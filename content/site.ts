/**
 * Shape and checks for content/site.json: settings the admin dashboard edits.
 * Run directly by Node during the build too, so keep ".ts" imports.
 */
import { z } from "zod";
import type { Content } from "./schema.ts";

export const MAX_FEATURED = 6;

export const siteSchema = z.strictObject({
  _note: z.string().optional(),
  featured: z
    .array(z.string())
    .max(MAX_FEATURED, `pick at most ${MAX_FEATURED} featured stories`),
  contact: z.strictObject({
    whatsapp: z
      .string()
      .regex(/^(\+?[0-9 ]{8,20})?$/, 'must be a phone number with country code, like "+250781234567", or empty'),
  }),
});

export type Site = z.infer<typeof siteSchema>;

/** `errors[i]` describes `issues[i]`; issue paths are 0-based, the error text counts from 1. */
export type SiteIssue = { path: (string | number)[]; message: string };

export type SiteResult = { ok: true; site: Site } | { ok: false; errors: string[]; issues: SiteIssue[] };

const siteError = ({ path, message }: SiteIssue) =>
  `site.json › ${path.map((k) => (typeof k === "number" ? k + 1 : k)).join(" › ") || "top"}: ${message}`;

/** Checks site.json against the content: featured stories must exist and be published. */
export function validateSite(raw: unknown, content: Content): SiteResult {
  const parsed = siteSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({
      path: i.path.map((k) => (typeof k === "number" ? k : String(k))),
      message: i.message,
    }));
    return { ok: false, errors: issues.map(siteError), issues };
  }
  const published = new Set(
    content.seasons
      .filter((s) => s.status === "published")
      .flatMap((s) => s.items.flatMap((i) => (i.type === "episode" ? [i.episode.id] : []))),
  );
  const notLive = (id: string) => `"${id}" is not a story in a published collection`;
  const issues: SiteIssue[] = parsed.data.featured.flatMap((id, i) =>
    published.has(id) ? [] : [{ path: ["featured", i], message: notLive(id) }],
  );
  const dup = parsed.data.featured.find((id, i) => parsed.data.featured.indexOf(id) !== i);
  if (dup) issues.push({ path: ["featured"], message: `"${dup}" is listed twice` });
  return issues.length ? { ok: false, errors: issues.map(siteError), issues } : { ok: true, site: parsed.data };
}

/** "+250 781 234 567" → { link: "https://wa.me/250781234567", label: "+250 781 234 567" } */
export function whatsappContact(number: string): { link: string; label: string } | null {
  const digits = number.replace(/\D/g, "");
  if (!digits) return null;
  return { link: `https://wa.me/${digits}`, label: number.trim().startsWith("+") ? number.trim() : `+${number.trim()}` };
}
