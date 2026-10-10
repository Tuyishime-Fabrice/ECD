/**
 * Times as the dashboard shows them: "4:05" for a story's length or the moment a
 * question appears. People type minutes:seconds; a bare number is refused because
 * "20" could mean 20 seconds or 20 minutes.
 */

/** "4:05" → 245, "1:02:03" → 3723. Null if it isn't minutes:seconds. "." works like ":" (4.05). */
export function parseClock(text: string): number | null {
  const parts = text.trim().split(/\s*[:.]\s*/);
  if (parts.length < 2 || parts.length > 3 || !parts.every((p) => /^\d+$/.test(p))) return null;
  const numbers = parts.map(Number);
  const [seconds] = numbers.slice(-1) as [number];
  const minutes = numbers[numbers.length - 2]!;
  if (seconds > 59 || (numbers.length === 3 && minutes > 59)) return null;
  return numbers.reduce((total, n) => total * 60 + n, 0);
}

/** 245 → "4:05", 3723 → "1:02:03". Rounds to the nearest second. */
export function formatClock(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** "Today at 14:05", "Yesterday at 09:30", "3 Oct at 10:00", "3 Oct 2025 at 10:00". */
export function friendlyDate(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysAgo = Math.round((day(now) - day(date)) / 86_400_000);
  if (daysAgo === 0) return `Today at ${time}`;
  if (daysAgo === 1) return `Yesterday at ${time}`;
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = date.getFullYear() === now.getFullYear() ? "" : ` ${date.getFullYear()}`;
  return `${date.getDate()} ${month}${year} at ${time}`;
}

/** "just now", "5 minutes ago", "2 hours ago", then friendlyDate. */
export function timeAgo(iso: string, now = new Date()): string {
  const seconds = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
  if (Number.isNaN(seconds)) return "";
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 12) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  return friendlyDate(iso, now);
}
