import { describe, expect, it } from "vitest";
import { normalizeClaimPath } from "../server/claim-paths.js";

describe("normalizeClaimPath", () => {
  it("normalizes slashes", () => {
    expect(normalizeClaimPath("knowledge\\foo.md")).toBe("knowledge/foo.md");
  });

  it("rejects traversal and absolute paths", () => {
    expect(() => normalizeClaimPath("../.env")).toThrow(/\.\./);
    expect(() => normalizeClaimPath("/etc/passwd")).toThrow(/relative/);
    expect(() => normalizeClaimPath("C:/Windows")).toThrow(/relative/);
  });
});
