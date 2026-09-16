import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  LEAD_HARVEST_HINT,
  parseStartArgs,
  startTeam,
  WORKER_WATCH_PROMPT,
} from "../server/bootstrap.js";
import { TeamStore } from "../server/store.js";

const dirs: string[] = [];

async function asPluginDevRepo(dir: string) {
  await writeFile(
    path.join(dir, "package.json"),
    `${JSON.stringify({ name: "cursor-agent-team", type: "module" }, null, 2)}\n`,
  );
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe("startTeam", () => {
  it("scaffolds, joins lead, and seeds one worker order", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "agent-team-start-"));
    dirs.push(dir);
    await asPluginDevRepo(dir);
    const result = await startTeam({
      workspaceRoot: dir,
      seedOrder: true,
      ensureBus: false,
    });
    expect(result.ok).toBe(true);
    expect(result.joined).toEqual({ id: "A", role: "lead" });
    expect(result.seededOrderId).toMatch(/^ord-/);
    const store = new TeamStore(dir);
    const board = await store.getBoard();
    expect(board.orders).toHaveLength(1);
    expect(board.orders[0]?.to).toBe("B");
    expect(board.orders[0]?.title).toContain("SMOKE");
    expect(board.orders[0]?.claim).toEqual(["knowledge/smoke-B.md"]);
    expect(result.human.workerLoop).toBeUndefined();
    expect(result.human.leadLoop).toBeUndefined();
    expect(WORKER_WATCH_PROMPT).toContain("watch-orders.mjs");
    expect(WORKER_WATCH_PROMPT).toContain("AGENT_TEAM_WAKE");
    expect(WORKER_WATCH_PROMPT).not.toMatch(/\/loop/);
    expect(WORKER_WATCH_PROMPT).toContain("Allow always");
    expect(WORKER_WATCH_PROMPT).toContain("dist/cli.js");
    expect(WORKER_WATCH_PROMPT).toContain("join");
    expect(LEAD_HARVEST_HINT).toContain("team_harvest");
    expect(LEAD_HARVEST_HINT).toContain("dist/cli.js harvest");
    expect(LEAD_HARVEST_HINT).not.toMatch(/\/loop 2m/);
    expect(result.human.leftover[1]).toContain("Allow always");
    expect(result.human.leftover[2]).toContain("/team-worker (agent B");
  });

  it("seeds a SMOKE order for each configured worker", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "agent-team-start-"));
    dirs.push(dir);
    const store = new TeamStore(dir);
    await store.scaffold();
    await asPluginDevRepo(dir);
    await writeFile(
      path.join(dir, "team", "config.json"),
      `${JSON.stringify(
        {
          enabled: true,
          port: 7391,
          leadId: "A",
          workers: ["B", "C", "D"],
        },
        null,
        2,
      )}\n`,
    );
    const result = await startTeam({
      workspaceRoot: dir,
      seedOrder: true,
      ensureBus: false,
    });
    expect(result.seededOrderId).toMatch(/^ord-/);
    const board = await store.getBoard();
    expect(board.orders).toHaveLength(3);
    expect(board.orders.map((o) => o.to).sort()).toEqual(["B", "C", "D"]);
    for (const id of ["B", "C", "D"]) {
      const order = board.orders.find((o) => o.to === id);
      expect(order?.title).toContain("SMOKE");
      expect(order?.claim).toEqual([`knowledge/smoke-${id}.md`]);
    }
  });

  it("does not seed a second order when one is already open", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "agent-team-start-"));
    dirs.push(dir);
    await asPluginDevRepo(dir);
    await startTeam({ workspaceRoot: dir, seedOrder: true, ensureBus: false });
    const again = await startTeam({ workspaceRoot: dir, seedOrder: true, ensureBus: false });
    expect(again.seededOrderId).toBeNull();
    const store = new TeamStore(dir);
    expect((await store.getBoard()).orders).toHaveLength(1);
    expect((await store.getBoard()).orders[0]?.to).toBe("B");
  });

  it("parses CLI flags", () => {
    const parsed = parseStartArgs(["--root", "E:\\proj", "--role", "worker", "--agent-id", "c", "--seed-order"]);
    expect(parsed).toEqual({
      root: "E:\\proj",
      role: "worker",
      agentId: "c",
      seedOrder: true,
    });
  });
});
