import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseCliArgs, runCli } from "../server/cli.js";
import { TeamStore } from "../server/store.js";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function tempTeam(): Promise<{ dir: string; store: TeamStore }> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "agent-team-cli-"));
  dirs.push(dir);
  const store = new TeamStore(dir);
  await store.scaffold();
  await store.join("A", "lead");
  await store.join("B", "worker");
  return { dir, store };
}

describe("cli", () => {
  it("parses harvest/status/delegate flags", () => {
    expect(parseCliArgs(["harvest"])).toEqual({ command: "harvest", agent: "A", mode: "parallel" });
    expect(parseCliArgs(["status", "--root", "E:\\proj", "--agent", "lead-a"])).toEqual({
      command: "status",
      root: "E:\\proj",
      agent: "lead-a",
      mode: "parallel",
    });
    expect(
      parseCliArgs([
        "delegate",
        "--to",
        "B",
        "--title",
        "Dump",
        "--brief",
        "write it",
        "--done-when",
        "file exists",
        "--claim",
        "knowledge/a.md,knowledge/b.md",
        "--mode",
        "assist",
      ]),
    ).toEqual({
      command: "delegate",
      agent: "A",
      mode: "assist",
      to: "B",
      title: "Dump",
      brief: "write it",
      doneWhen: "file exists",
      claim: ["knowledge/a.md", "knowledge/b.md"],
    });
  });

  it("parses poll/claim/report/join flags with default agent B", () => {
    expect(parseCliArgs(["poll"])).toEqual({ command: "poll", agent: "B", mode: "parallel" });
    expect(parseCliArgs(["claim", "--order", "ord-1"])).toEqual({
      command: "claim",
      agent: "B",
      mode: "parallel",
      order: "ord-1",
    });
    expect(
      parseCliArgs(["report", "--order", "ord-1", "--body", "Wrote it", "--status", "blocked", "--agent", "C"]),
    ).toEqual({
      command: "report",
      agent: "C",
      mode: "parallel",
      order: "ord-1",
      body: "Wrote it",
      reportStatus: "blocked",
    });
    expect(parseCliArgs(["join"])).toEqual({
      command: "join",
      agent: "B",
      mode: "parallel",
      role: "worker",
    });
    expect(parseCliArgs(["join", "--agent", "D", "--role", "worker"])).toEqual({
      command: "join",
      agent: "D",
      mode: "parallel",
      role: "worker",
    });
  });

  it("rejects unknown commands without asking for a path", () => {
    expect(() => parseCliArgs(["nudge"])).toThrow(/Never ask the human/);
  });

  it("status, delegate, and harvest against a temp dir", async () => {
    const { dir } = await tempTeam();
    const statusPath = path.join(dir, "team", "status.json");
    const status = JSON.parse(await readFile(statusPath, "utf8")) as { agents: Record<string, unknown> };
    status.agents.E = {
      id: "E",
      role: "worker",
      doing: "joined",
      lastResult: "stale",
      ts: "2020-01-01T00:00:00.000Z",
    };
    await writeFile(statusPath, `${JSON.stringify(status, null, 2)}\n`);
    const board = (await runCli(["status", "--root", dir])) as { orders: unknown[]; agents: { id: string }[] };
    expect(board.agents.map((a) => a.id).sort()).toEqual(["A", "B"]);
    expect(board.orders).toHaveLength(0);

    const order = (await runCli([
      "delegate",
      "--root",
      dir,
      "--to",
      "B",
      "--title",
      "Dump NIDs",
      "--brief",
      "Write knowledge/nids.md",
      "--done-when",
      "table exists",
      "--claim",
      "knowledge/nids.md",
    ])) as { id: string; status: string; to: string; claim: string[] };
    expect(order.status).toBe("open");
    expect(order.to).toBe("B");
    expect(order.claim).toEqual(["knowledge/nids.md"]);

    const openBoard = (await runCli(["status", "--root", dir])) as {
      orders: { title: string; brief?: string }[];
      agents: { id: string }[];
    };
    expect(openBoard.agents.map((a) => a.id).sort()).toEqual(["A", "B"]);
    expect(openBoard.orders[0]?.title).toBe("Dump NIDs");
    expect(openBoard.orders[0]).not.toHaveProperty("brief");

    const polled = (await runCli(["poll", "--root", dir])) as { orders: { id: string; brief: string }[] };
    expect(polled.orders.map((o) => o.id)).toEqual([order.id]);
    expect(polled.orders[0]?.brief).toBe("Write knowledge/nids.md");

    const claimed = (await runCli(["claim", "--root", dir, "--order", order.id])) as { status: string };
    expect(claimed.status).toBe("claimed");

    const reported = (await runCli([
      "report",
      "--root",
      dir,
      "--order",
      order.id,
      "--body",
      "Wrote NIDs.",
    ])) as { status: string; resultBody: string };
    expect(reported.status).toBe("done");
    expect(reported.resultBody).toBe("Wrote NIDs.");

    const harvested = (await runCli(["harvest", "--root", dir, "--agent", "A"])) as {
      results: { id: string; title: string; brief?: string }[];
    };
    expect(harvested.results.map((r) => r.id)).toEqual([order.id]);
    expect(harvested.results[0]?.title).toBe("Dump NIDs");
    expect(harvested.results[0]).not.toHaveProperty("brief");
    const empty = (await runCli(["harvest", "--root", dir])) as { results: unknown[] };
    expect(empty.results).toHaveLength(0);
  });

  it("delegate requires --to --title --brief --done-when", async () => {
    const { dir } = await tempTeam();
    await expect(runCli(["delegate", "--root", dir, "--to", "B"])).rejects.toThrow(/delegate requires/);
  });

  it("claim requires --order and report requires --order --body", async () => {
    const { dir } = await tempTeam();
    await expect(runCli(["claim", "--root", dir])).rejects.toThrow(/claim requires --order/);
    await expect(runCli(["report", "--root", dir, "--order", "ord-x"])).rejects.toThrow(
      /report requires --order --body/,
    );
  });

  it("join defaults to worker B and can join the next worker", async () => {
    const { dir } = await tempTeam();
    const again = (await runCli(["join", "--root", dir])) as { id: string; role: string };
    expect(again).toMatchObject({ id: "B", role: "worker" });
    const joined = (await runCli(["join", "--root", dir, "--agent", "C", "--role", "worker"])) as {
      id: string;
      role: string;
    };
    expect(joined).toMatchObject({ id: "C", role: "worker" });
    const board = (await runCli(["status", "--root", dir])) as { agents: { id: string }[] };
    expect(board.agents.map((a) => a.id).sort()).toEqual(["A", "B", "C"]);
  });
});
