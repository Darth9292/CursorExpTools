import { mkdtemp, rm, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { INBOX_MAX_BODY_CHARS, KEEP_DONE_ORDERS, TeamStore } from "../server/store.js";

const dirs: string[] = [];

async function tempStore(): Promise<TeamStore> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "agent-team-"));
  dirs.push(dir);
  const store = new TeamStore(dir);
  await store.scaffold();
  return store;
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe("TeamStore", () => {
  it("scaffolds team files and gitignore snippets", async () => {
    const store = await tempStore();
    const config = await store.readConfig();
    expect(config?.enabled).toBe(true);
    expect(config?.leadId).toBe("A");
    expect(config?.workers).toEqual(["B"]);
    expect(config?.workspaceRoot).toBe(store.root);
    const gitignore = await readFile(path.join(store.root, ".gitignore"), "utf8");
    expect(gitignore).toContain("team/.lock");
    expect(gitignore).toContain("team/*.lock");
    expect(gitignore).toContain("team/activity.jsonl");
    await expect(readFile(path.join(store.teamDir, "activity.jsonl"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("does not overwrite existing config on rescaffold", async () => {
    const store = await tempStore();
    const configPath = path.join(store.teamDir, "config.json");
    await writeFile(
      configPath,
      JSON.stringify({ enabled: true, port: 7400, leadId: "lead-a", workers: ["b", "c"] }, null, 2),
    );
    await store.scaffold();
    const config = await store.readConfig();
    expect(config?.port).toBe(7400);
    expect(config?.workers).toEqual(["b", "c"]);
  });

  it("runs delegate, claim, report, harvest across two store instances", async () => {
    const store = await tempStore();
    const lead = new TeamStore(store.root);
    const worker = new TeamStore(store.root);
    await lead.join("lead-a", "lead");
    await worker.join("b", "worker");

    const order = await lead.delegate({
      from: "lead-a",
      to: "b",
      mode: "parallel",
      title: "Dump NIDs",
      brief: "Write knowledge/nids.md",
      doneWhen: "table exists",
      claim: ["knowledge/nids.md"],
    });
    expect(order.status).toBe("open");

    const polled = await worker.poll("b");
    expect(polled.map((o) => o.id)).toContain(order.id);

    const claimed = await worker.claimOrder("b", order.id);
    expect(claimed.status).toBe("claimed");
    const claimedOnDisk = JSON.parse(await readFile(path.join(store.teamDir, "orders.json"), "utf8")) as {
      orders: { id: string; brief: string; status: string }[];
    };
    expect(claimedOnDisk.orders.find((o) => o.id === order.id)?.brief).toBe("Write knowledge/nids.md");

    const reported = await worker.report("b", order.id, "done", "Wrote 12 NIDs.");
    expect(reported.status).toBe("done");
    const result = await readFile(path.join(store.teamDir, "results", `${order.id}.md`), "utf8");
    expect(result).toContain("Wrote 12 NIDs.");

    const doneOnDisk = JSON.parse(await readFile(path.join(store.teamDir, "orders.json"), "utf8")) as {
      orders: { id: string; brief: string; status: string }[];
    };
    expect(doneOnDisk.orders.find((o) => o.id === order.id)?.brief).toBe("");

    const firstHarvest = await lead.harvest("lead-a");
    expect(firstHarvest).toHaveLength(1);
    expect(firstHarvest[0]).toEqual({
      id: order.id,
      to: "B",
      title: "Dump NIDs",
      status: "done",
      resultBody: "Wrote 12 NIDs.",
      resultPath: `team/results/${order.id}.md`,
      updatedAt: reported.updatedAt,
    });
    expect(firstHarvest[0]).not.toHaveProperty("brief");

    const secondHarvest = await lead.harvest("lead-a");
    expect(secondHarvest).toHaveLength(0);
  });

  it("harvest('lead-a') leaves only A in harvest.json", async () => {
    const store = await tempStore();
    await store.join("lead-a", "lead");
    await writeFile(
      path.join(store.teamDir, "harvest.json"),
      JSON.stringify(
        { cursors: { "lead-a": "2026-01-01T00:00:00.000Z", A: "2026-01-02T00:00:00.000Z" } },
        null,
        2,
      ),
    );
    await store.harvest("lead-a");
    const harvest = JSON.parse(await readFile(path.join(store.teamDir, "harvest.json"), "utf8")) as {
      cursors: Record<string, string>;
    };
    expect(Object.keys(harvest.cursors)).toEqual(["A"]);
    expect(harvest.cursors.A).toBeTruthy();
  });

  it("rejects worker using lead-only tools and lead using worker-only tools", async () => {
    const store = await tempStore();
    await store.join("lead-a", "lead");
    await store.join("b", "worker");
    await expect(store.poll("lead-a")).rejects.toThrow(/requires worker/);
    await expect(
      store.delegate({
        from: "b",
        to: "lead-a",
        mode: "parallel",
        title: "nope",
        brief: "nope",
        doneWhen: "nope",
      }),
    ).rejects.toThrow(/requires lead/);
  });

  it("rejects traversal and absolute claim paths", async () => {
    const store = await tempStore();
    await store.join("lead-a", "lead");
    await expect(
      store.delegate({
        from: "lead-a",
        to: "b",
        mode: "parallel",
        title: "bad",
        brief: "bad",
        doneWhen: "bad",
        claim: ["../.env"],
      }),
    ).rejects.toThrow(/\.\./);
    await expect(store.claimPaths("lead-a", ["/etc/passwd"], null)).rejects.toThrow(/relative/);
  });

  it("blocks conflicting path claims and expires leases", async () => {
    const store = await tempStore();
    await store.join("lead-a", "lead");
    await store.join("b", "worker");
    await store.claimPaths("lead-a", ["knowledge/module-m.md"], null, 30_000);
    await expect(store.claimPaths("b", ["knowledge/module-m.md"], null, 30_000)).rejects.toThrow(
      /claimed by 'A'/,
    );
    await store.claimPaths("b", ["knowledge/nids.md"], null, 1);
    await new Promise((r) => setTimeout(r, 5));
    const active = await store.expireClaims();
    expect(active.some((c) => c.path === "knowledge/nids.md")).toBe(false);
    expect(active.some((c) => c.path === "knowledge/module-m.md")).toBe(true);
  });

  it("rejects oversized inbox bodies", async () => {
    const store = await tempStore();
    await store.join("lead-a", "lead");
    const huge = "x".repeat(INBOX_MAX_BODY_CHARS + 1);
    await expect(
      store.inboxSend({ from: "lead-a", to: "B", type: "finding", body: huge }),
    ).rejects.toThrow(/exceeds/);
  });

  it("askLead blocks the order and writes inbox", async () => {
    const store = await tempStore();
    await store.join("lead-a", "lead");
    await store.join("b", "worker");
    const order = await store.delegate({
      from: "lead-a",
      to: "b",
      mode: "assist",
      title: "vtable",
      brief: "stuck",
      doneWhen: "better read",
    });
    await store.claimOrder("b", order.id);
    const { order: blocked, message } = await store.askLead("b", order.id, "Is this a vtable?");
    expect(blocked.status).toBe("blocked");
    expect(message.type).toBe("question");
    const inbox = await store.inboxRead();
    expect(inbox.some((m) => m.id === message.id)).toBe(true);
  });

  it("serializes two writers on the same team dir", async () => {
    const store = await tempStore();
    const a = new TeamStore(store.root);
    const b = new TeamStore(store.root);
    await a.join("lead-a", "lead");
    await b.join("b", "worker");
    await Promise.all([
      a.inboxSend({ from: "lead-a", to: "b", type: "finding", body: "one" }),
      b.inboxSend({ from: "b", to: "lead-a", type: "finding", body: "two" }),
      a.inboxSend({ from: "lead-a", to: "*", type: "finding", body: "three" }),
    ]);
    const inbox = await store.inboxRead(10);
    expect(inbox).toHaveLength(3);
    expect(inbox.map((m) => m.body).sort()).toEqual(["one", "three", "two"]);
  });

  it("requires join before mutating", async () => {
    const store = await tempStore();
    await expect(store.whoami("lead-a")).rejects.toThrow(/has not joined/);
  });

  it("auto-joins a configured worker on poll", async () => {
    const store = await tempStore();
    await store.join("lead-a", "lead");
    const polled = await store.poll("b");
    expect(polled).toEqual([]);
    const me = await store.whoami("b");
    expect(me.id).toBe("B");
    expect(me.role).toBe("worker");
  });

  it("auto-registers the next worker C", async () => {
    const store = await tempStore();
    await store.join("A", "lead");
    await store.join("B", "worker");
    const c = await store.join("C", "worker");
    expect(c.id).toBe("C");
    const config = await store.readConfig();
    expect(config?.workers).toEqual(["B", "C"]);
    await expect(store.join("E", "worker")).rejects.toThrow(/Next worker is 'D'/);
  });

  it("caps resultBody at 240 in orders.json and keeps full text in results/*.md", async () => {
    const store = await tempStore();
    await store.join("A", "lead");
    await store.join("B", "worker");
    const order = await store.delegate({
      from: "A",
      to: "B",
      mode: "parallel",
      title: "Long",
      brief: "write",
      doneWhen: "done",
    });
    await store.claimOrder("B", order.id);
    const long = "x".repeat(400);
    const reported = await store.report("B", order.id, "done", long);
    expect(reported.resultBody).toHaveLength(240);
    const onDisk = JSON.parse(await readFile(path.join(store.teamDir, "orders.json"), "utf8")) as {
      orders: { resultBody: string }[];
    };
    expect(onDisk.orders[0]?.resultBody).toHaveLength(240);
    const md = await readFile(path.join(store.teamDir, "results", `${order.id}.md`), "utf8");
    expect(md).toContain(long);
  });

  it("caps existing resultBody when saving orders", async () => {
    const store = await tempStore();
    await store.join("A", "lead");
    await store.join("B", "worker");
    const order = await store.delegate({
      from: "A",
      to: "B",
      mode: "parallel",
      title: "Cap me",
      brief: "write",
      doneWhen: "done",
    });
    const bloated = JSON.parse(await readFile(path.join(store.teamDir, "orders.json"), "utf8")) as {
      orders: { resultBody: string | null }[];
    };
    bloated.orders[0]!.resultBody = "y".repeat(400);
    await writeFile(path.join(store.teamDir, "orders.json"), `${JSON.stringify(bloated, null, 2)}\n`, "utf8");
    await store.claimOrder("B", order.id);
    const onDisk = JSON.parse(await readFile(path.join(store.teamDir, "orders.json"), "utf8")) as {
      orders: { resultBody: string }[];
    };
    expect(onDisk.orders[0]?.resultBody).toHaveLength(240);
  });

  it("skips a status rewrite when heartbeat doing and lastResult are unchanged", async () => {
    const store = await tempStore();
    await store.join("B", "worker", "idle");
    const first = await store.whoami("B");
    const statusPath = path.join(store.teamDir, "status.json");
    const before = (await stat(statusPath)).mtimeMs;
    const again = await store.heartbeat("B", "idle");
    expect(again.ts).toBe(first.ts);
    expect(again.doing).toBe("idle");
    expect((await stat(statusPath)).mtimeMs).toBe(before);
    const sameResult = await store.heartbeat("B", "idle", first.lastResult);
    expect(sameResult.ts).toBe(first.ts);
    await new Promise((r) => setTimeout(r, 5));
    const changed = await store.heartbeat("B", "working");
    expect(changed.doing).toBe("working");
    expect(changed.ts).not.toBe(first.ts);
  });

  it("does not reread inbox.jsonl on a second append under the cap", async () => {
    const store = await tempStore();
    await store.join("A", "lead");
    await store.inboxSend({ from: "A", to: "*", type: "finding", body: "prime" });
    const inboxPath = path.join(store.teamDir, "inbox.jsonl");
    const stuffed = Array.from({ length: 100 }, (_, i) => JSON.stringify({ n: i })).join("\n") + "\n";
    await writeFile(inboxPath, stuffed, "utf8");
    await store.inboxSend({ from: "A", to: "*", type: "finding", body: "second" });
    const lines = (await readFile(inboxPath, "utf8")).split(/\r?\n/).filter((line) => line.length > 0);
    expect(lines).toHaveLength(101);
    expect(lines[100]).toContain("second");
  });

  it("rotates inbox.jsonl to the last 100 lines", async () => {
    const store = await tempStore();
    await store.join("A", "lead");
    for (let i = 0; i < 105; i++) {
      await store.inboxSend({ from: "A", to: "*", type: "finding", body: `m${i}` });
    }
    const inbox = await store.inboxRead(200);
    expect(inbox).toHaveLength(100);
    expect(inbox[0]?.body).toBe("m5");
    expect(inbox[99]?.body).toBe("m104");
    const raw = await readFile(path.join(store.teamDir, "inbox.jsonl"), "utf8");
    const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
    expect(lines).toHaveLength(100);
  });

  it("prunes older done orders but keeps results md", async () => {
    const store = await tempStore();
    await store.join("A", "lead");
    await store.join("B", "worker");
    const orders: Record<string, unknown>[] = [];
    for (let i = 0; i < KEEP_DONE_ORDERS + 5; i++) {
      const id = `ord-d${i}`;
      const ts = `2026-01-01T00:00:${String(i).padStart(2, "0")}.000Z`;
      orders.push({
        id,
        from: "A",
        to: "B",
        mode: "parallel",
        status: "done",
        title: `T${i}`,
        brief: "b",
        claim: [],
        doneWhen: "d",
        resultPath: `team/results/${id}.md`,
        resultBody: "ok",
        createdAt: ts,
        updatedAt: ts,
      });
      await writeFile(path.join(store.teamDir, "results", `${id}.md`), `# T${i}\n`, "utf8");
    }
    const openId = "ord-open1";
    orders.push({
      id: openId,
      from: "A",
      to: "B",
      mode: "parallel",
      status: "open",
      title: "Live",
      brief: "b",
      claim: [],
      doneWhen: "d",
      resultPath: null,
      resultBody: null,
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    await writeFile(
      path.join(store.teamDir, "orders.json"),
      `${JSON.stringify({ orders }, null, 2)}\n`,
      "utf8",
    );
    await store.claimOrder("B", openId);
    const onDisk = JSON.parse(await readFile(path.join(store.teamDir, "orders.json"), "utf8")) as {
      orders: { id: string; status: string }[];
    };
    const done = onDisk.orders.filter((o) => o.status === "done");
    expect(done).toHaveLength(KEEP_DONE_ORDERS);
    expect(onDisk.orders.some((o) => o.id === openId)).toBe(true);
    expect(onDisk.orders.some((o) => o.id === "ord-d0")).toBe(false);
    expect(done.map((o) => o.id)).toContain(`ord-d${KEEP_DONE_ORDERS + 4}`);
    const md = await readFile(path.join(store.teamDir, "results", "ord-d0.md"), "utf8");
    expect(md).toContain("T0");
  });
});
