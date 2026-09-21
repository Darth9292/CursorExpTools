import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  canonicalizeAgentId,
  loadOrdersFile,
  newOpenIds,
  openIdsForAgent,
  parseWatchArgs,
  resolveWorkspaceRoot,
  snapshotOpenIds,
  wakeLine,
  eventTargetsOrders,
} from "../hooks/watch-orders.mjs";

describe("watch-orders", () => {
  it("canonicalizes ids", () => {
    expect(canonicalizeAgentId("b")).toBe("B");
    expect(canonicalizeAgentId("worker-c")).toBe("C");
  });

  it("lists only open orders for that worker", () => {
    const orders = [
      { id: "ord-1", to: "B", status: "open" },
      { id: "ord-2", to: "B", status: "claimed" },
      { id: "ord-3", to: "C", status: "open" },
      { id: "ord-4", to: "b", status: "open" },
    ];
    expect(openIdsForAgent(orders, "B")).toEqual(["ord-1", "ord-4"]);
  });

  it("ignores status.json watch events when the filename is known", () => {
    expect(eventTargetsOrders("orders.json")).toBe(true);
    expect(eventTargetsOrders("orders.json.tmp")).toBe(true);
    expect(eventTargetsOrders(null)).toBe(true);
    expect(eventTargetsOrders("status.json")).toBe(false);
  });

  it("wakes only on newly opened ids", () => {
    expect(newOpenIds(["ord-1"], ["ord-1", "ord-2"])).toEqual(["ord-2"]);
    expect(newOpenIds(["ord-1", "ord-2"], ["ord-2"])).toEqual([]);
  });

  it("parses argv and wake line", () => {
    expect(parseWatchArgs(["--agent", "D", "--root", "E:\\proj"])).toEqual({
      agent: "D",
      root: "E:\\proj",
    });
    expect(wakeLine("B", ["ord-9"])).toBe(
      'AGENT_TEAM_WAKE {"agent":"B","orderIds":["ord-9"]}',
    );
  });

  it("reads { orders } files", () => {
    const dir = path.join(os.tmpdir(), `watch-orders-${Date.now()}`);
    mkdirSync(path.join(dir, "team"), { recursive: true });
    writeFileSync(
      path.join(dir, "team", "orders.json"),
      JSON.stringify({
        orders: [{ id: "ord-z", to: "B", status: "open" }],
      }),
    );
    expect(loadOrdersFile(path.join(dir, "team", "orders.json"))[0].id).toBe("ord-z");
    expect(snapshotOpenIds(dir, "B")).toEqual(["ord-z"]);
    expect(snapshotOpenIds(dir, "C")).toEqual([]);
  });

  it("resolveWorkspaceRoot walks up to team/config.json", () => {
    const ws = path.join(os.tmpdir(), `watch-root-${Date.now()}`);
    const nested = path.join(ws, "sub", "deep");
    mkdirSync(nested, { recursive: true });
    mkdirSync(path.join(ws, "team"), { recursive: true });
    writeFileSync(path.join(ws, "team", "config.json"), '{"enabled":true}');
    expect(resolveWorkspaceRoot(nested)).toBe(ws);
    expect(resolveWorkspaceRoot(ws)).toBe(ws);
  });

  it("resolveWorkspaceRoot prefers orders.json in starting dir", () => {
    const ws = path.join(os.tmpdir(), `watch-root-ord-${Date.now()}`);
    mkdirSync(path.join(ws, "team"), { recursive: true });
    writeFileSync(path.join(ws, "team", "orders.json"), "[]");
    expect(resolveWorkspaceRoot(ws)).toBe(ws);
  });
});
