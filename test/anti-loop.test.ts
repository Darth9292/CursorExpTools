import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { WORKER_WATCH_PROMPT } from "../server/bootstrap.js";

const ROOT = path.join(import.meta.dirname, "..");

const WORKER_FACING = [
  "skills/team-worker/SKILL.md",
  "commands/team-worker.md",
  "agents/team-worker.md",
  "rules/agent-team.mdc",
  "knowledge/approvals.md",
  "hooks/session-start.mjs",
  "knowledge/usage.md",
];

const HARD_BANS = [
  /keep the 1m loop/i,
  /keep the loop/i,
  /self-loop/i,
  /never say [`"]?stop[`"]?/i,
  /workerLoop/i,
];

function lineSuggestsWorkerLoop(line: string): boolean {
  if (!/\/loop\b/.test(line)) return false;
  if (
    /do\s+\*\*not\*\*|do not|never|not a|Forbidden|— not|no timed|still no/i.test(line)
  ) {
    return false;
  }
  if (/\/loop\s+1h/.test(line)) return false;
  return true;
}

describe("anti-loop (workers must not revive /loop)", () => {
  it("WORKER_WATCH_PROMPT never mentions /loop", () => {
    expect(WORKER_WATCH_PROMPT).toContain("watch-orders.mjs");
    expect(WORKER_WATCH_PROMPT).not.toMatch(/\/loop/);
  });

  it("worker-facing plugin files do not instruct /loop", () => {
    for (const rel of WORKER_FACING) {
      const text = readFileSync(path.join(ROOT, rel), "utf8");
      for (const ban of HARD_BANS) {
        expect(text, rel).not.toMatch(ban);
      }
      const bad = text
        .split(/\r?\n/)
        .filter((line) => lineSuggestsWorkerLoop(line));
      expect(bad, `${rel} suggests worker /loop:\n${bad.join("\n")}`).toEqual([]);
    }
  });
});
