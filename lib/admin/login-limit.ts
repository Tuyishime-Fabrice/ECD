/**
 * A cheap guard against guessing the dashboard password (docs/ADMIN.md, "Security").
 * After 10 wrong passwords from one address in 15 minutes, that address must wait until
 * the oldest of them is 15 minutes old; the sign-in route then answers 429. All addresses
 * together are capped as well, against guesses spread over many addresses (or a made-up
 * x-forwarded-for where no proxy sets it).
 *
 * It is kept in memory, so it counts per server instance: Vercel may run several, and a
 * restart forgets. It slows guessing down a lot, but a long password is what keeps it out
 * of reach.
 */

export const LOGIN_WINDOW_MS = 15 * 60_000;

export type LoginLimiter = {
  /** How long (ms) this client must wait before its next try; 0 when it may try now. */
  retryAfter(client: string, now?: number): number;
  /** Counts a wrong password. Call it right after `retryAfter`, with no `await` between them. */
  failed(client: string, now?: number): void;
  /** A right password: that client starts again from zero. */
  succeeded(client: string): void;
  /** How many addresses are remembered (for tests: it stays small). */
  size(now?: number): number;
  reset(): void;
};

export function createLoginLimiter({
  perClient = 10,
  perInstance = 100,
  windowMs = LOGIN_WINDOW_MS,
}: { perClient?: number; perInstance?: number; windowMs?: number } = {}): LoginLimiter {
  /** Failure times per client, oldest first, at most `perClient` each. */
  const clients = new Map<string, number[]>();
  /** Failure times of all clients, oldest first, at most `perInstance`. */
  let all: number[] = [];

  const forget = (now: number) => {
    all = all.filter((t) => now - t < windowMs);
    for (const [client, times] of clients) {
      const recent = times.filter((t) => now - t < windowMs);
      if (recent.length) clients.set(client, recent);
      else clients.delete(client);
    }
  };
  /** When `times` holds `max` failures, the wait until the oldest of them leaves the window. */
  const wait = (times: number[], max: number, now: number) =>
    times.length >= max ? times[times.length - max]! + windowMs - now : 0;

  return {
    retryAfter(client, now = Date.now()) {
      forget(now);
      return Math.max(wait(clients.get(client) ?? [], perClient, now), wait(all, perInstance, now), 0);
    },
    failed(client, now = Date.now()) {
      clients.set(client, [...(clients.get(client) ?? []), now].slice(-perClient));
      all = [...all, now].slice(-perInstance);
    },
    succeeded(client) {
      clients.delete(client);
    },
    size(now = Date.now()) {
      forget(now);
      return clients.size;
    },
    reset() {
      clients.clear();
      all = [];
    },
  };
}

/** The one the sign-in route uses. */
export const loginLimiter = createLoginLimiter();

/** The address a request came from: the first x-forwarded-for entry (Vercel sets it), else x-real-ip. */
export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** "15 minutes", "1 minute": how long until signing in works again. */
export const waitInWords = (ms: number) => {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
};
