import { describe, expect, it } from "vitest";
import { canonicalizeAgentId, nextWorkerId } from "../server/ids.js";

describe("agent ids", () => {
  it("canonicalizes letters, lead-a, and numbers", () => {
    expect(canonicalizeAgentId("a")).toBe("A");
    expect(canonicalizeAgentId("lead-a")).toBe("A");
    expect(canonicalizeAgentId("B")).toBe("B");
    expect(canonicalizeAgentId("worker-c")).toBe("C");
    expect(canonicalizeAgentId("1")).toBe("1");
    expect(canonicalizeAgentId("12")).toBe("12");
  });

  it("rejects empty and junk", () => {
    expect(() => canonicalizeAgentId("")).toThrow(/empty/);
    expect(() => canonicalizeAgentId("bb")).toThrow(/Invalid agent id/);
    expect(() => canonicalizeAgentId("0")).toThrow(/Invalid agent id/);
  });

  it("allocates B-Z then numbers after Z", () => {
    expect(nextWorkerId(["A"])).toBe("B");
    expect(nextWorkerId(["A", "B"])).toBe("C");
    expect(nextWorkerId(["A", "B", "C"])).toBe("D");
    const taken = ["A", ..."BCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
    expect(nextWorkerId(taken)).toBe("1");
    expect(nextWorkerId([...taken, "1"])).toBe("2");
  });
});
