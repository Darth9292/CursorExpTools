import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseSuggestWorkerCliArgs, runSuggestWorkerCli } from "../server/suggest-worker-cli.js";
import { TeamStore } from "../server/store.js";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function tempTeam(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "agent-team-suggest-cli-"));
  dirs.push(dir);
  const store = new TeamStore(dir);
  await store.scaffold();
  await store.join("B", "worker");
  await store.join("C", "worker");
  return dir;
}

describe("suggest-worker CLI", () => {
  it("parses --root --claim and --hint", () => {
    expect(parseSuggestWorkerCliArgs(["--claim", "knowledge/mcp-tools.md", "--hint", "docs"])).toEqual({
      claim: ["knowledge/mcp-tools.md"],
      hint: "docs",
    });
    expect(parseSuggestWorkerCliArgs(["--claim", "a.md,b.md"])).toEqual({ claim: ["a.md", "b.md"] });
  });

  it("ranks workers for a docs claim path", async () => {
    const dir = await tempTeam();
    const result = (await runSuggestWorkerCli(
      ["--root", dir, "--claim", "knowledge/mcp-tools.md"],
      dir,
    )) as { ranked: { id: string; score: number }[]; suggested: { id: string } | null };
    expect(result.ranked[0]?.id).toBe("C");
    expect(result.ranked[0]?.score).toBeGreaterThan(result.ranked.find((r) => r.id === "B")?.score ?? 0);
    expect(result.suggested?.id).toBe("C");
  });
});
