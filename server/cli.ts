#!/usr/bin/env node
import { boardSnapshotForMcp } from "./mcp-tools.js";
import { TeamStore } from "./store.js";
import { DEFAULT_LEAD_ID, DEFAULT_WORKER_ID, type OrderMode, type Role } from "./types.js";
import { resolveWorkspaceRoot } from "./workspace.js";

export type CliCommand = "harvest" | "status" | "delegate" | "poll" | "claim" | "report" | "join";

const LEAD_COMMANDS = new Set<CliCommand>(["harvest", "status", "delegate"]);
const WORKER_COMMANDS = new Set<CliCommand>(["poll", "claim", "report", "join"]);
const COMMANDS = new Set<CliCommand>([...LEAD_COMMANDS, ...WORKER_COMMANDS]);
const MODES = new Set<OrderMode>(["parallel", "assist", "handoff"]);
const REPORT_STATUSES = new Set<string>(["done", "blocked"]);
const ROLES = new Set<Role>(["lead", "worker"]);

export interface CliArgs {
  command: CliCommand;
  root?: string;
  agent: string;
  to?: string;
  title?: string;
  brief?: string;
  doneWhen?: string;
  claim?: string[];
  mode: OrderMode;
  order?: string;
  body?: string;
  reportStatus?: "done" | "blocked";
  role?: Role;
}

function takeValue(argv: string[], i: number, flag: string): { value: string; next: number } {
  const value = argv[i + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return { value, next: i + 1 };
}

function isCommand(value: string | undefined): value is CliCommand {
  return !!value && COMMANDS.has(value as CliCommand);
}

export function parseCliArgs(argv: string[]): CliArgs {
  const command = argv[0];
  if (!isCommand(command)) {
    throw new Error(
      "Usage: harvest | status | delegate | poll | claim | report | join [--agent A|B] [--root omitted=pwd]. Never ask the human to paste a path.",
    );
  }
  const args: CliArgs = {
    command,
    agent: WORKER_COMMANDS.has(command) ? DEFAULT_WORKER_ID : DEFAULT_LEAD_ID,
    mode: "parallel",
    ...(command === "join" ? { role: "worker" as Role } : {}),
  };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--agent" || a === "--agent-id" || a === "--agentId") {
      const t = takeValue(argv, i, a);
      args.agent = t.value;
      i = t.next;
    } else if (a === "--root") {
      const t = takeValue(argv, i, a);
      args.root = t.value;
      i = t.next;
    } else if (a === "--to") {
      const t = takeValue(argv, i, a);
      args.to = t.value;
      i = t.next;
    } else if (a === "--title") {
      const t = takeValue(argv, i, a);
      args.title = t.value;
      i = t.next;
    } else if (a === "--brief") {
      const t = takeValue(argv, i, a);
      args.brief = t.value;
      i = t.next;
    } else if (a === "--done-when" || a === "--doneWhen") {
      const t = takeValue(argv, i, a);
      args.doneWhen = t.value;
      i = t.next;
    } else if (a === "--claim") {
      const t = takeValue(argv, i, a);
      args.claim = t.value
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      i = t.next;
    } else if (a === "--mode") {
      const t = takeValue(argv, i, a);
      if (!MODES.has(t.value as OrderMode)) {
        throw new Error(`--mode must be parallel, assist, or handoff (got '${t.value}')`);
      }
      args.mode = t.value as OrderMode;
      i = t.next;
    } else if (a === "--order" || a === "--order-id" || a === "--orderId") {
      const t = takeValue(argv, i, a);
      args.order = t.value;
      i = t.next;
    } else if (a === "--body") {
      const t = takeValue(argv, i, a);
      args.body = t.value;
      i = t.next;
    } else if (a === "--status") {
      const t = takeValue(argv, i, a);
      if (!REPORT_STATUSES.has(t.value)) {
        throw new Error(`--status must be done or blocked (got '${t.value}')`);
      }
      args.reportStatus = t.value as "done" | "blocked";
      i = t.next;
    } else if (a === "--role") {
      const t = takeValue(argv, i, a);
      if (!ROLES.has(t.value as Role)) {
        throw new Error(`--role must be lead or worker (got '${t.value}')`);
      }
      args.role = t.value as Role;
      i = t.next;
    } else {
      throw new Error(`Unknown flag '${a}'`);
    }
  }
  return args;
}

export async function runCli(argv: string[], cwd = process.cwd()): Promise<unknown> {
  const args = parseCliArgs(argv);
  const root = resolveWorkspaceRoot(args.root, cwd);
  const store = new TeamStore(root);
  if (args.command === "harvest") {
    const results = await store.harvest(args.agent);
    return { results };
  }
  if (args.command === "status") {
    return boardSnapshotForMcp(await store.getBoard());
  }
  if (args.command === "join") {
    return store.join(args.agent, args.role ?? "worker");
  }
  if (args.command === "poll") {
    const orders = await store.poll(args.agent);
    return { orders };
  }
  if (args.command === "claim") {
    if (!args.order) {
      throw new Error("claim requires --order");
    }
    return store.claimOrder(args.agent, args.order);
  }
  if (args.command === "report") {
    if (!args.order || !args.body) {
      throw new Error("report requires --order --body");
    }
    return store.report(args.agent, args.order, args.reportStatus ?? "done", args.body);
  }
  if (!args.to || !args.title || !args.brief || !args.doneWhen) {
    throw new Error("delegate requires --to --title --brief --done-when");
  }
  return store.delegate({
    from: args.agent,
    to: args.to,
    mode: args.mode,
    title: args.title,
    brief: args.brief,
    doneWhen: args.doneWhen,
    claim: args.claim,
  });
}

async function main(): Promise<void> {
  try {
    const result = await runCli(process.argv.slice(2));
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

const isEntry =
  process.argv[1]?.replaceAll("\\", "/").endsWith("/cli.js") ||
  process.argv[1]?.replaceAll("\\", "/").endsWith("/cli.ts");

if (isEntry) {
  void main();
}
