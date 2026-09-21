/**
 * Idle workers must not /loop. This process watches team/orders.json and
 * prints one line when this agent gets a *new* open order. Cursor can
 * notify_on_output on AGENT_TEAM_WAKE -- one model turn per new order,
 * not one turn per minute.
 *
 * Usage: node hooks/watch-orders.mjs --agent B [--root <workspace>]
 */
import { existsSync, mkdirSync, readFileSync, watch } from "node:fs";
import path from "node:path";

export function canonicalizeAgentId(raw) {
  const s = String(raw ?? "").trim();
  if (!s) throw new Error("Agent id is empty");
  const named = s.match(/^(?:lead|agent|worker)[-_]?([A-Za-z])$/i);
  if (named?.[1]) return named[1].toUpperCase();
  if (/^[A-Za-z]$/.test(s)) return s.toUpperCase();
  if (/^[1-9]\d*$/.test(s)) return s;
  throw new Error(`Invalid agent id '${raw}'`);
}

export function openIdsForAgent(orders, agentId) {
  const id = canonicalizeAgentId(agentId);
  if (!Array.isArray(orders)) return [];
  const ids = [];
  for (const order of orders) {
    if (!order || order.status !== "open") continue;
    try {
      if (canonicalizeAgentId(order.to) === id) ids.push(order.id);
    } catch {
      /* skip bad to */
    }
  }
  return ids;
}

export function newOpenIds(prev, next) {
  const seen = new Set(prev);
  return next.filter((id) => !seen.has(id));
}

export function loadOrdersFile(file) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  if (Array.isArray(json)) return json;
  return Array.isArray(json.orders) ? json.orders : [];
}

export function parseWatchArgs(argv) {
  let agent;
  let root = process.cwd();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--agent" && argv[i + 1]) agent = argv[++i];
    else if (a === "--root" && argv[i + 1]) root = argv[++i];
  }
  return { agent, root };
}

/** Find workspace when agent shell cwd is wrong (e.g. System32). */
export function resolveWorkspaceRoot(candidateRoot) {
  let dir = path.resolve(candidateRoot);
  const stop = path.parse(dir).root;
  while (true) {
    const orders = path.join(dir, "team", "orders.json");
    if (existsSync(orders)) return dir;
    const config = path.join(dir, "team", "config.json");
    if (existsSync(config)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir || dir === stop) break;
    dir = parent;
  }
  return path.resolve(candidateRoot);
}

export function wakeLine(agent, orderIds) {
  return `AGENT_TEAM_WAKE ${JSON.stringify({ agent, orderIds })}`;
}

/** Directory watches also fire for status.json. Ignore those when the filename is known. */
export function eventTargetsOrders(filename) {
  if (!filename) return true;
  const name = String(filename);
  return name === "orders.json" || name.startsWith("orders.json");
}

function teamDir(root) {
  return path.join(root, "team");
}

function ordersPath(root) {
  return path.join(teamDir(root), "orders.json");
}

export function snapshotOpenIds(root, agent) {
  const file = ordersPath(root);
  if (!existsSync(file)) return [];
  return openIdsForAgent(loadOrdersFile(file), agent);
}

function main() {
  const { agent, root: rootArg } = parseWatchArgs(process.argv.slice(2));
  if (!agent) {
    console.error("usage: node hooks/watch-orders.mjs --agent B [--root <workspace>]");
    process.exit(1);
  }
  const root = resolveWorkspaceRoot(rootArg);
  const id = canonicalizeAgentId(agent);
  const dir = teamDir(root);
  mkdirSync(dir, { recursive: true });
  let prev = snapshotOpenIds(root, id);
  let timer;
  const onMaybeChange = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const next = snapshotOpenIds(root, id);
        const fresh = newOpenIds(prev, next);
        prev = next;
        if (fresh.length) console.log(wakeLine(id, fresh));
      } catch {
        /* fail open */
      }
    }, 300);
  };
  watch(dir, { persistent: true }, (_event, filename) => {
    if (eventTargetsOrders(filename)) onMaybeChange();
  });
  console.error(`watching ${ordersPath(root)} for open orders to ${id}`);
}

const entry = process.argv[1]?.replaceAll("\\", "/");
if (entry?.endsWith("/watch-orders.mjs")) {
  main();
}
