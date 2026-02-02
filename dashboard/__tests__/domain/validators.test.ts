import { describe, it, expect } from "vitest";
import {
  isValidTmStatus,
  isCustomStatus,
  validateTaskFields,
} from "../../lib/domain/validators";

describe("isValidTmStatus", () => {
  const valid = ["pending", "in-progress", "done", "deferred", "cancelled", "blocked", "review"];
  for (const s of valid) {
    it(`returns true for "${s}"`, () => {
      expect(isValidTmStatus(s)).toBe(true);
    });
  }
  it("returns false for paused", () => {
    expect(isValidTmStatus("paused")).toBe(false);
  });
  it("returns false for verified", () => {
    expect(isValidTmStatus("verified")).toBe(false);
  });
  it("returns false for arbitrary string", () => {
    expect(isValidTmStatus("foo")).toBe(false);
  });
});

describe("isCustomStatus", () => {
  it("returns true for paused", () => {
    expect(isCustomStatus("paused")).toBe(true);
  });
  it("returns true for verified", () => {
    expect(isCustomStatus("verified")).toBe(true);
  });
  it("returns false for pending", () => {
    expect(isCustomStatus("pending")).toBe(false);
  });
});

describe("validateTaskFields", () => {
  it("rejects empty title", () => {
    const r = validateTaskFields({ title: "   " });
    expect(r.valid).toBe(false);
    expect(r.error).toContain("empty");
  });
  it("accepts valid title", () => {
    expect(validateTaskFields({ title: "Hello" }).valid).toBe(true);
  });
  it("accepts when no title provided", () => {
    expect(validateTaskFields({ description: "desc" }).valid).toBe(true);
  });
});
