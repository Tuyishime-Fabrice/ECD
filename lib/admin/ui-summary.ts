/**
 * The one-line description of a save that History shows ("Added story “Keza's
 * One Mango” and moved stories"). Built from what the person did, in order.
 */

/** The server keeps 100 characters of a summary, but an undo quotes only 80 of them, so stay within 80. */
export const MAX_SUMMARY = 80;

export function summarize(changes: readonly string[]): string {
  const list = [...new Set(changes.map((c) => c.trim()).filter(Boolean))];
  if (!list.length) return "Update stories";
  const join = (parts: string[]) =>
    parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)!.replace(/^./, (c) => c.toLowerCase())}`;
  for (let shown = Math.min(list.length, 3); shown >= 1; shown--) {
    const more = list.length - shown;
    const parts = list.slice(0, shown).map((p, i) => (i ? p.replace(/^./, (c) => c.toLowerCase()) : p));
    const text = more ? `${parts.join(", ")} and ${more} more ${more === 1 ? "change" : "changes"}` : join(parts);
    if (text.length <= MAX_SUMMARY) return text;
  }
  const first = list[0]!;
  return first.length <= MAX_SUMMARY ? first : `${first.slice(0, MAX_SUMMARY - 1)}…`;
}

/** “Keza's One Mango”, shortened so a summary keeps room for the rest. */
export function quoteTitle(title: string, fallback = "untitled", max = 40): string {
  const t = title.trim() || fallback;
  return `“${t.length > max ? `${t.slice(0, max - 1)}…` : t}”`;
}
