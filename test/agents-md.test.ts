import { describe, expect, it } from "vitest";
import { mergeWorkerPersonas, parseAgentsMarkdown } from "../server/agents-md.js";

const SAMPLE = `# DayZ mod workspace

Enfusion scripts and server packing for Chernarus+.

## Agent B — Gameplay

- **Title:** Lead scripter
- **Focus:** CF triggers and economy

### C - Assets

- **Title:** PBO pipeline
- **Focus:** models and configs

- D: Server ops — battleye-friendly cfgs and balancing
`;

describe("agents-md", () => {
  it("parses headings and inline worker lines", () => {
    const parsed = parseAgentsMarkdown(SAMPLE, ["B", "C", "D"]);
    expect(parsed.domain).toContain("DayZ");
    expect(parsed.workers.B?.title).toBe("Lead scripter");
    expect(parsed.workers.C?.title).toContain("PBO");
    expect(parsed.workers.D?.title).toContain("Server ops");
  });

  it("chat overrides beat AGENTS.md", () => {
    const fromFile = parseAgentsMarkdown(SAMPLE, ["B"]).workers;
    const merged = mergeWorkerPersonas(
      ["B"],
      fromFile,
      { B: { title: "User said RE lead", focus: "MIPS first" } },
      { B: { title: "default", focus: "default" } },
    );
    expect(merged.B.title).toBe("User said RE lead");
  });
});
