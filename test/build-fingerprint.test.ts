import { describe, expect, it } from "vitest";
import { isDistStale, readDistBuildId } from "../server/build-fingerprint.js";

describe("build-fingerprint", () => {
  it("reads dist/daemon.js mtime", () => {
    const id = readDistBuildId();
    expect(id).not.toBeNull();
    expect(typeof id).toBe("number");
  });

  it("detects stale when buildId differs", () => {
    const local = readDistBuildId();
    expect(isDistStale(local)).toBe(false);
    expect(isDistStale((local ?? 0) - 1)).toBe(true);
    expect(isDistStale(undefined)).toBe(false);
  });
});
