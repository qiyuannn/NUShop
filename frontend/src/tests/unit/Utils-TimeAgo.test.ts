// timeAgo.test.ts
import { timeAgo } from "@/lib/timeAgo";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("timeAgo", () => {
  const NOW = new Date("2026-07-24T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for a timestamp less than 1 minute ago', () => {
    const timestamp = new Date(NOW.getTime() - 30 * 1000).toISOString(); // 30s ago
    expect(timeAgo(timestamp)).toBe("Just now");
  });

  it('returns "Just now" for a timestamp exactly at now', () => {
    expect(timeAgo(NOW.toISOString())).toBe("Just now");
  });

  it('returns "X min ago" for a timestamp under 60 minutes ago', () => {
    const timestamp = new Date(NOW.getTime() - 5 * 60 * 1000).toISOString(); // 5 min ago
    expect(timeAgo(timestamp)).toBe("5 min ago");
  });

  it('returns "X hr ago" for a timestamp under 24 hours ago', () => {
    const timestamp = new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString(); // 3 hr ago
    expect(timeAgo(timestamp)).toBe("3 hr ago");
  });

  it('returns "X days ago" for multi-day timestamps', () => {
    const timestamp = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days
    expect(timeAgo(timestamp)).toBe("5 days ago");
  });

  it("handles a timestamp far in the past (e.g. 100 days)", () => {
    const timestamp = new Date(NOW.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(timestamp)).toBe("100 days ago");
  });

  describe("edge cases", () => {
    it("handles a future timestamp (negative diff) without throwing", () => {
      const timestamp = new Date(NOW.getTime() + 5 * 60 * 1000).toISOString(); // 5 min in future
      // diffMinutes will be negative, which is < 1, so falls into "Just now"
      expect(timeAgo(timestamp)).toBe("Just now");
    });

    it("handles an invalid date string", () => {
      const result = timeAgo("not-a-real-date");
      // new Date("not-a-real-date") -> Invalid Date, diffMs -> NaN, comparisons -> false
      // falls through to the final return
      expect(result).toBe("NaN days ago");
    });
  });
});