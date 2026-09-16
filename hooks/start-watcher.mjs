/**
 * Boot watch-orders.mjs with resolved workspace root and record the child pid.
 *
 * Usage: node hooks/start-watcher.mjs --agent B [--root <workspace>]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  canonicalizeAgentId,
  parseWatchArgs,
  resolveWorkspaceRoot,
} from "./watch-orders.mjs";

const hookDir = path.dirname(fileURLToPath(import.meta.url));

export function parseStartWatcherArgs(argv) {
  return parseWatchArgs(argv);
}

export function watchersDir(root) {
  return path.join(root, "team", "watchers");
}

export function watcherPidPath(root, agentId) {
  const id = canonicalizeAgentId(agentId);
  return path.join(watchersDir(root), `${id}.pid`);
}

export function formatPidRecord(pid, startedAt = new Date().toISOString()) {
  return JSON.stringify({ pid, startedAt }, null, 2) + "\n";
}

export function writeWatcherPidFile(root, agentId, pid, startedAt) {
  const dir = watchersDir(root);
  mkdirSync(dir, { recursive: true });
  const file = watcherPidPath(root, agentId);
  writeFileSync(file, formatPidRecord(pid, startedAt), "utf8");
  return file;
}

export function watchOrdersScriptPath() {
  return path.join(hookDir, "watch-orders.mjs");
}

export function spawnWatchOrders({ agent, root, node = process.execPath }) {
  const script = watchOrdersScriptPath();
  const child = spawn(node, [script, "--agent", agent, "--root", root], {
    stdio: "inherit",
    windowsHide: true,
  });
  return child;
}

function main() {
  const { agent, root: rootArg } = parseStartWatcherArgs(process.argv.slice(2));
  if (!agent) {
    console.error("usage: node hooks/start-watcher.mjs --agent B [--root <workspace>]");
    process.exit(1);
  }
  const id = canonicalizeAgentId(agent);
  const root = resolveWorkspaceRoot(rootArg);
  const startedAt = new Date().toISOString();
  const child = spawnWatchOrders({ agent: id, root });
  if (!child.pid) {
    console.error("failed to start watch-orders.mjs");
    process.exit(1);
  }
  const pidFile = writeWatcherPidFile(root, id, child.pid, startedAt);
  console.error(`started watch-orders pid ${child.pid} (${pidFile})`);
  child.on("exit", (code, signal) => {
    process.exit(code ?? (signal ? 1 : 0));
  });
}

const entry = process.argv[1]?.replaceAll("\\", "/");
if (entry?.endsWith("/start-watcher.mjs")) {
  main();
}
