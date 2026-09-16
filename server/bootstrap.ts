import { ensureDaemon } from "./ensure-daemon.js";
import { TeamStore } from "./store.js";
import { resolveWorkspaceRoot } from "./workspace.js";
import { isPluginDevWorkspace } from "./project-profile.js";
import { DEFAULT_PORT, DEFAULT_WORKER_ID, type Role } from "./types.js";

/** Worker idle wake: file watcher only. Do not expose as a pasteable “loop” prompt in CLI JSON. */
export const WORKER_WATCH_PROMPT =
  "Follow the team-worker skill (/team-worker). Never run timed agent loops in worker windows. Join as this window's worker id (argument C, D, ... or default B; A is lead). Omit workspaceRoot unless team_* errors. team_poll once. If team_* missing, node dist/cli.js join --agent <id> then poll. If an open order exists, claim, work, report. Then start ONE background watcher: node hooks/watch-orders.mjs --agent <id> --root <workspaceRoot> (or %USERPROFILE%\\.cursor\\plugins\\local\\cursor-agent-team\\hooks\\watch-orders.mjs). Shell notify_on_output pattern ^AGENT_TEAM_WAKE. On wake: poll, work, report; leave the watcher running. Kill the watcher only if the user asks to stop. If frozen on Allow: click Allow always, then start the watcher.";

/** @deprecated Use WORKER_WATCH_PROMPT */
export const WORKER_LOOP_PROMPT = WORKER_WATCH_PROMPT;

export const LEAD_HARVEST_HINT =
  "Harvest on user continue: team_harvest then team_status, then team_delegate if workers idle. If team_* missing, node dist/cli.js harvest --agent A then status. Do not run a timed /loop unless the user explicitly wants unattended harvest (/loop 1h max — each tick is billed).";

/** @deprecated Use LEAD_HARVEST_HINT */
export const LEAD_LOOP_PROMPT = LEAD_HARVEST_HINT;

export interface StartTeamInput {
  workspaceRoot?: string;
  role?: Role;
  agentId?: string;
  doing?: string;
  seedOrder?: boolean;
  ensureBus?: boolean;
}

export interface StartTeamResult {
  ok: true;
  workspaceRoot: string;
  joined: { id: string; role: Role };
  bus: { url: string; started?: boolean; health?: unknown };
  seededOrderId: string | null;
  human: {
    leftover: string[];
    /** @deprecated Removed from JSON output — use /team-worker skill, not a pasted prompt. */
    workerLoop?: string;
    /** @deprecated Removed from JSON output — use team-lead skill. */
    leadLoop?: string;
  };
}

export async function startTeam(input: StartTeamInput): Promise<StartTeamResult> {
  const store = new TeamStore(resolveWorkspaceRoot(input.workspaceRoot));
  await store.scaffold();
  const config = await store.requireEnabled();
  const role: Role = input.role ?? "lead";
  const agentId =
    input.agentId ?? (role === "lead" ? config.leadId : config.workers[0] ?? DEFAULT_WORKER_ID);

  let bus: StartTeamResult["bus"] = {
    url: `http://127.0.0.1:${config.port ?? DEFAULT_PORT}/mcp`,
  };
  if (input.ensureBus !== false) {
    const ensured = await ensureDaemon(config.port ?? DEFAULT_PORT);
    if (!ensured.ok) {
      throw new Error(ensured.error ?? "Failed to start team bus");
    }
    bus = { url: ensured.url, started: ensured.started, health: ensured.health };
  }

  const joined = await store.join(
    agentId,
    role,
    input.doing ?? (role === "lead" ? "lead online, team started" : "worker online"),
  );

  let seededOrderId: string | null = null;
  if (input.seedOrder && role === "lead") {
    const board = await store.getBoard();
    const open = board.orders.filter((o) => o.status === "open" || o.status === "claimed");
    if (open.length === 0) {
      const workers =
        config.workers.length > 0 ? config.workers : [DEFAULT_WORKER_ID];
      for (let i = 0; i < workers.length; i++) {
        const worker = workers[i]!;
        const smokePath = `knowledge/smoke-${worker}.md`;
        const dev = isPluginDevWorkspace(store.root);
        const order = await store.delegate({
          from: agentId,
          to: worker,
          mode: "parallel",
          title: dev ? `SMOKE: ${smokePath}` : `Boot: confirm specialist role`,
          brief: dev
            ? `Write ${smokePath} with one line confirming worker ${worker} woke.`
            : `Read knowledge/project.md (your specialist section). Write ${smokePath} with one line: your title + that you are online. If project.md is still a template, reply idle — lead should run /team-adapt first.`,
          doneWhen: dev ? `${smokePath} exists` : `${smokePath} exists or idle noted`,
          claim: [smokePath],
        });
        if (i === 0) {
          seededOrderId = order.id;
        }
      }
    }
  }

  return {
    ok: true,
    workspaceRoot: store.root,
    joined: { id: joined.id, role: joined.role },
    bus,
    seededOrderId,
    human: {
      leftover: [
        "Command Palette: Workspaces: Duplicate Workspace in New Window",
        "If the new window shows Allow, click Allow always (localhost / agent-team MCP)",
        "In that window run /team-worker (agent B; it joins, polls once, and starts an orders.json watcher — not a 1m /loop)",
        "For a third agent: Duplicate Workspace again, then /team-worker C (then D, E, ... Z, then 1, 2, 3...)",
        "Keep talking only in this lead chat (agent A).",
        "In this chat run /team-adapt once so workers match this repo (PS3 RE, DayZ modding, etc.). Existing .cursor/rules and user prompts stay — team layer only coordinates windows.",
      ],
    },
  };
}

export function parseStartArgs(argv: string[]): {
  root: string;
  role: Role;
  agentId?: string;
  seedOrder: boolean;
} {
  let root = process.cwd();
  let role: Role = "lead";
  let agentId: string | undefined;
  let seedOrder = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root" && argv[i + 1]) {
      root = argv[++i];
    } else if (a === "--role" && argv[i + 1]) {
      role = argv[++i] as Role;
    } else if ((a === "--agent-id" || a === "--agentId") && argv[i + 1]) {
      agentId = argv[++i];
    } else if (a === "--seed-order") {
      seedOrder = true;
    }
  }
  return { root, role, agentId, seedOrder };
}
