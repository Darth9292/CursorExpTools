import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { canonicalizeAgentId } from "./watch-orders.mjs";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function workspaceRoots(input) {
  const roots = [];
  for (const key of ["workspace_roots", "workspaceRoots", "roots"]) {
    if (Array.isArray(input[key])) roots.push(...input[key]);
  }
  if (typeof input.cwd === "string") roots.push(input.cwd);
  if (typeof process.env.CURSOR_PROJECT_DIR === "string") {
    roots.push(process.env.CURSOR_PROJECT_DIR);
  }
  return [...new Set(roots.filter((r) => typeof r === "string" && r.length > 0))];
}

export function readConfig(root) {
  const file = path.join(root, "team", "config.json");
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function isPidAlive(pid) {
  const n = Number(pid);
  if (!Number.isInteger(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch {
    return false;
  }
}

export function readWatcherPidFile(file) {
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, "utf8").trim();
  const line = raw.split(/\r?\n/)[0]?.trim();
  const n = Number(line);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function watcherPidPath(root, agentId) {
  const id = canonicalizeAgentId(agentId);
  return path.join(root, "team", "watchers", `${id}.pid`);
}

/** True when pid file missing, unreadable, or process not running. */
export function isWatcherStale(root, agentId) {
  const pid = readWatcherPidFile(watcherPidPath(root, agentId));
  if (pid === null) return true;
  return !isPidAlive(pid);
}

export function anyWorkerWatcherStale(root, workers) {
  if (!Array.isArray(workers) || workers.length === 0) return false;
  return workers.some((w) => isWatcherStale(root, w));
}

export function staleWatcherContextLine() {
  return (
    "Worker window: if orders do not wake you, re-run /team-worker — " +
    "team/watchers/<your-id>.pid missing or a dead PID means the orders watcher died (often after Reload Window)."
  );
}

async function isBusDistStale(port) {
  try {
    const daemonJs = path.join(pluginRoot, "dist", "daemon.js");
    if (!existsSync(daemonJs)) return false;
    const local = statSync(daemonJs).mtimeMs;
    const res = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: AbortSignal.timeout(500),
    });
    if (!res.ok) return false;
    const body = await res.json();
    if (typeof body.buildId !== "number") return false;
    return Math.round(body.buildId) !== Math.round(local);
  } catch {
    return false;
  }
}

function spawnEnsure(port) {
  const ensureJs = path.join(pluginRoot, "dist", "ensure-daemon.js");
  if (!existsSync(ensureJs)) return;
  const child = spawn(process.execPath, [ensureJs, "--port", String(port)], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    cwd: pluginRoot,
  });
  child.unref();
}

async function main() {
  const input = await readStdin();
  const roots = workspaceRoots(input);
  let enabled = false;
  let port = 7391;
  let teamRoot = null;
  let workers = [];

  for (const root of roots) {
    const config = readConfig(root);
    if (config?.enabled) {
      enabled = true;
      port = Number(config.port) || 7391;
      teamRoot = root;
      workers = Array.isArray(config.workers) ? config.workers : [];
      break;
    }
  }

  if (!enabled) {
    process.stdout.write("{}\n");
    process.exit(0);
  }

  spawnEnsure(port);

  const projectMd = teamRoot ? path.join(teamRoot, "knowledge", "project.md") : null;
  const hasProjectProfile = projectMd && existsSync(projectMd);

  const lines = [
    "This workspace has an agent team (team/config.json).",
    hasProjectProfile
      ? "Lead: /team-adapt to refresh specialist roles; workers read knowledge/project.md for domain roles."
      : "Lead: run /team-adapt after /team-start to specialize workers for this repo (without replacing existing rules).",
    "Prefer /team-start in the window that talks to the user.",
    "In extra windows run /team-worker (poll once, then watch-orders.mjs). Never use Cursor /loop in worker windows.",
    "After Developer: Reload Window in a worker chat, run /team-worker again (watcher is not persisted).",
    "If an Allow card appears, click Allow always (localhost / agent-team MCP).",
    "Do not skip team_join. Workers: never /loop (any interval). Do not paste a filesystem path. Do not tell the user to type in the other window.",
    `Team bus: http://127.0.0.1:${port}/mcp (health http://127.0.0.1:${port}/health).`,
    "Prefer team_* tools when the agent-team MCP is green; if missing, node dist/cli.js (lead: harvest --agent A; workers: join then poll --agent <id>).",
  ];

  if (teamRoot && anyWorkerWatcherStale(teamRoot, workers)) {
    lines.push(staleWatcherContextLine());
  }

  if (await isBusDistStale(port)) {
    lines.push(
      "Bus dist is stale: kill the process on port " +
        port +
        ", run npm run ensure:bus, then Reload Window so MCP exposes the latest team_* tools.",
    );
  }

  process.stdout.write(
    JSON.stringify({
      additional_context: lines.filter(Boolean).join(" "),
    }),
  );
  process.stdout.write("\n");
}

const entry = process.argv[1]?.replaceAll("\\", "/");
if (entry?.endsWith("/session-start.mjs")) {
  await main();
}
