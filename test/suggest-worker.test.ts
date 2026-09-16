import { describe, expect, it } from "vitest";
import { suggestWorkers, topWorkerSuggestion } from "../server/suggest-worker.js";
import type { ProjectProfile } from "../server/project-profile.js";

const profile: ProjectProfile = {
  domain: "test",
  summary: "test",
  workers: {
    B: { title: "Runtime", focus: "server hooks MCP" },
    C: { title: "Docs", focus: "skills README" },
  },
  sources: [],
  adaptedAt: null,
};

describe("suggestWorkers", () => {
  it("ranks B for server paths", () => {
    const ranked = suggestWorkers({
      workerIds: ["B", "C"],
      profile,
      claim: ["server/mcp-tools.ts"],
    });
    expect(ranked[0]?.id).toBe("B");
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
  });

  it("ranks C for knowledge doc paths", () => {
    const ranked = suggestWorkers({
      workerIds: ["B", "C"],
      profile,
      claim: ["knowledge/mcp-tools.md"],
    });
    expect(ranked[0]?.id).toBe("C");
  });

  it("returns null top when tied or no signal", () => {
    const ranked = suggestWorkers({ workerIds: ["B", "C"], profile, claim: [] });
    expect(topWorkerSuggestion(ranked)).toBeNull();
  });

  it("ranks C above B for knowledge/mcp-tools.md (docs, not server)", () => {
    const ranked = suggestWorkers({
      workerIds: ["B", "C"],
      profile,
      claim: ["knowledge/mcp-tools.md"],
    });
    expect(ranked[0]?.id).toBe("C");
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
  });
});
