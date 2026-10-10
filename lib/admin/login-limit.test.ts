import { describe, expect, it } from "vitest";
import { clientAddress, createLoginLimiter } from "./login-limit";

const MIN = 60_000;

describe("createLoginLimiter", () => {
  it("lets a client try 10 wrong passwords in 15 minutes, then makes it wait", () => {
    const limit = createLoginLimiter();
    for (let i = 0; i < 10; i++) {
      expect(limit.retryAfter("a", i * MIN)).toBe(0);
      limit.failed("a", i * MIN);
    }
    // The 11th try, at minute 10: wait until the first failure is 15 minutes old.
    expect(limit.retryAfter("a", 10 * MIN)).toBe(5 * MIN);
    expect(limit.retryAfter("a", 15 * MIN - 1)).toBe(1);
    expect(limit.retryAfter("a", 15 * MIN)).toBe(0);
    // Other clients aren't affected.
    expect(limit.retryAfter("b", 10 * MIN)).toBe(0);
  });

  it("forgets a client's failures when it signs in", () => {
    const limit = createLoginLimiter();
    for (let i = 0; i < 10; i++) limit.failed("a", 0);
    limit.succeeded("a");
    expect(limit.retryAfter("a", 1)).toBe(0);
  });

  it("caps wrong passwords from all clients together", () => {
    const limit = createLoginLimiter({ perClient: 10, perInstance: 30 });
    for (let i = 0; i < 30; i++) limit.failed(`client-${i}`, 0);
    expect(limit.retryAfter("someone-new", MIN)).toBe(14 * MIN);
    expect(limit.retryAfter("someone-new", 15 * MIN)).toBe(0);
  });

  it("keeps memory small however many addresses try", () => {
    const limit = createLoginLimiter({ perClient: 10, perInstance: 50 });
    for (let i = 0; i < 10_000; i++) if (!limit.retryAfter(`spoofed-${i}`, i)) limit.failed(`spoofed-${i}`, i);
    expect(limit.size()).toBeLessThanOrEqual(50);
    expect(limit.size(16 * MIN)).toBe(0);
  });
});

describe("clientAddress", () => {
  const request = (headers: Record<string, string>) => new Request("http://localhost/api/admin/login", { headers });
  it("takes the first x-forwarded-for address, then x-real-ip", () => {
    expect(clientAddress(request({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
    expect(clientAddress(request({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
    expect(clientAddress(request({}))).toBe("unknown");
  });
});
