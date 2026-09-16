import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  activeOrdersForMcp,
  boardSnapshotForMcp,
  compactBoardForMcp,
  joinPayloadForMcp,
  withWorkspaceRoot,
} from "../server/mcp-tools.js";
import { TeamStore } from "../server/store.js";
import type { Order } from "../server/types.js";

function sampleOrder(overrides: Partial<Order> & Pick<Order, "id" | "status">): Order {
  return {
    from: "A",
    to: "B",
    mode: "parallel",
    title: "t",
    brief: "KEEP-OR-DROP-BRIEF",
    claim: ["knowledge/x.md"],
    doneWhen: "done",
    resultPath: "team/results/x.md",
    resultBody: "KEEP-OR-DROP-BODY",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:01.000Z",
    ...overrides,
  };
}

describe("MCP tool registration", () => {
  it("registers team_read_project and enriches delegate briefs", () => {
    const src = readFileSync(path.join(import.meta.dirname, "../server/mcp-tools.ts"), "utf8");
    expect(src).toMatch(/"team_read_project"/);
    expect(src).toMatch(/"team_adapt"/);
    expect(src).toMatch(/"team_suggest_worker"/);
    expect(src).toContain("enrichDelegateBrief(profile, args.to, args.brief)");
  });
});

describe("joinPayloadForMcp (team_join includeBoard contract)", () => {
  const joined = { id: "B", role: "worker", doing: "joined" };
  const board = {
    orders: [
      sampleOrder({ id: "ord-open", status: "open" }),
      sampleOrder({ id: "ord-done", status: "done" }),
    ],
  };

  it("omits board when includeBoard is false", () => {
    const payload = joinPayloadForMcp(joined, board, false);
    expect(payload).toEqual({ joined });
    expect(payload).not.toHaveProperty("board");
  });

  it("includes active board snapshot when includeBoard is true or omitted", () => {
    const expectedBoard = boardSnapshotForMcp(board);
    expect(joinPayloadForMcp(joined, board, true)).toEqual({ joined, board: expectedBoard });
    expect(joinPayloadForMcp(joined, board)).toEqual({ joined, board: expectedBoard });
  });
});

describe("withWorkspaceRoot", () => {
  it("adds absolute store.root to join/poll-shaped payloads", () => {
    const store = new TeamStore(path.resolve("E:/proj"));
    const poll = withWorkspaceRoot(store, { count: 0, orders: [] });
    expect(poll.workspaceRoot).toBe(store.root);
    expect(poll.count).toBe(0);
    const join = withWorkspaceRoot(store, { joined: { id: "B" }, board: { orders: [] } });
    expect(join.workspaceRoot).toBe(store.root);
    expect(join.joined).toEqual({ id: "B" });
  });
});

describe("compactBoardForMcp", () => {
  it("strips brief and resultBody from done orders", () => {
    const done = sampleOrder({ id: "ord-done", status: "done" });
    const compacted = compactBoardForMcp({ orders: [done] }).orders[0]!;
    expect(compacted).toEqual({
      id: "ord-done",
      to: "B",
      status: "done",
      title: "t",
      resultPath: "team/results/x.md",
      updatedAt: "2026-01-01T00:00:01.000Z",
    });
    expect(compacted).not.toHaveProperty("brief");
    expect(compacted).not.toHaveProperty("resultBody");
  });

  it("leaves open orders intact", () => {
    const open = sampleOrder({ id: "ord-open", status: "open", to: "C" });
    const compacted = compactBoardForMcp({ orders: [open] }).orders[0];
    expect(compacted).toEqual(open);
    expect(compacted?.brief).toBe("KEEP-OR-DROP-BRIEF");
    expect(compacted?.resultBody).toBe("KEEP-OR-DROP-BODY");
  });
});

describe("activeOrdersForMcp", () => {
  it("keeps only open and claimed orders", () => {
    const board = {
      orders: [
        sampleOrder({ id: "d", status: "done" }),
        sampleOrder({ id: "o", status: "open" }),
        sampleOrder({ id: "c", status: "claimed" }),
      ],
    };
    const ids = activeOrdersForMcp(board).orders.map((o) => o.id);
    expect(ids).toEqual(["o", "c"]);
  });

  it("boardSnapshotForMcp drops done orders entirely", () => {
    const board = {
      orders: [sampleOrder({ id: "d", status: "done" }), sampleOrder({ id: "o", status: "open" })],
    };
    expect(boardSnapshotForMcp(board).orders).toHaveLength(1);
    expect(boardSnapshotForMcp(board).orders[0]?.id).toBe("o");
  });
});
