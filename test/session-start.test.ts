import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  anyWorkerWatcherStale,
  isPidAlive,
  isWatcherStale,
  readWatcherPidFile,
  staleWatcherContextLine,
} from "../hooks/session-start.mjs";

const dirs: string[] = [];

afterEach(() => {
  while (dirs.length) {
    const d = dirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

describe("session-start watcher hints", () => {
  it("isPidAlive reflects current process", () => {
    expect(isPidAlive(process.pid)).toBe(true);
    expect(isPidAlive(0)).toBe(false);
  });

  it("treats missing pid file as stale", () => {
    const dir = path.join(os.tmpdir(), `session-start-${Date.now()}`);
    mkdirSync(path.join(dir, "team", "watchers"), { recursive: true });
    dirs.push(dir);
    expect(isWatcherStale(dir, "D")).toBe(true);
    expect(anyWorkerWatcherStale(dir, ["B", "D"])).toBe(true);
  });

  it("treats dead pid as stale", () => {
    const dir = path.join(os.tmpdir(), `session-start-dead-${Date.now()}`);
    const watchers = path.join(dir, "team", "watchers");
    mkdirSync(watchers, { recursive: true });
    writeFileSync(path.join(watchers, "D.pid"), "999999999\n");
    dirs.push(dir);
    expect(readWatcherPidFile(path.join(watchers, "D.pid"))).toBe(999999999);
    expect(isWatcherStale(dir, "D")).toBe(true);
  });

  it("staleWatcherContextLine mentions /team-worker", () => {
    expect(staleWatcherContextLine()).toContain("/team-worker");
    expect(staleWatcherContextLine()).toContain("watchers");
  });
});
