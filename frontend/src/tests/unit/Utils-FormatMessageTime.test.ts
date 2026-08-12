import { formatMessageTime } from "@/lib/fomatTime";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("Format Message Time", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("should return time if its the same day", () => {
    vi.setSystemTime(new Date("2026-07-24T12:00:00Z"));

    const result = formatMessageTime("2026-07-24T12:00:00Z")
    expect(result).toMatch("8:00 pm")
  })

  it("should return date if its a different day", () => {
    vi.setSystemTime(new Date("2026-07-24T12:00:00Z"));

    const result = formatMessageTime("2026-07-23T12:00:00Z")
    expect(result).toMatch("23 Jul 2026")
  })
})
