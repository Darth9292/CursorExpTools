import { mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatPidRecord,
  parseStartWatcherArgs,
  spawnWatchOrders,
  watcherPidPath,
  watchersDir,
  watchOrdersScriptPath,
  writeWatcherPidFile,
} from "../hooks/start-watcher.mjs";

describe("start-watcher", () => {
  it("parses argv like watch-orders", () => {
    expect(parseStartWatcherArgs(["--agent", "C", "--root", "E:\\ws"])).toEqual({
      agent: "C",
      root: "E:\\ws",
    });
  });

  it("writes pid file under team/watchers", () => {
    const ws = path.join(os.tmpdir(), `start-watcher-${Date.now()}`);
    mkdirSync(path.join(ws, "team"), { recursive: true });
    const file = writeWatcherPidFile(ws, "c", 4242, "2026-09-15T00:00:00.000Z");
    expect(file).toBe(watcherPidPath(ws, "C"));
    expect(watchersDir(ws)).toBe(path.join(ws, "team", "watchers"));
    const body = JSON.parse(readFileSync(file, "utf8"));
    expect(body).toEqual({ pid: 4242, startedAt: "2026-09-15T00:00:00.000Z" });
  });

  it("formatPidRecord is stable JSON", () => {
    expect(formatPidRecord(1, "t")).toBe('{\n  "pid": 1,\n  "startedAt": "t"\n}\n');
  });

  it("resolves watch-orders script next to hooks", () => {
    expect(watchOrdersScriptPath()).toMatch(/watch-orders\.mjs$/);
  });

  it("spawnWatchOrders accepts node path", () => {
    const child = spawnWatchOrders({
      agent: "B",
      root: process.cwd(),
      node: process.execPath,
    });
    expect(child.pid).toBeGreaterThan(0);
    child.kill();
  });
});
