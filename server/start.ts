#!/usr/bin/env node
import { parseStartArgs, startTeam } from "./bootstrap.js";

async function main(): Promise<void> {
  try {
    const args = parseStartArgs(process.argv.slice(2));
    const result = await startTeam({
      workspaceRoot: args.root,
      role: args.role,
      agentId: args.agentId,
      seedOrder: args.seedOrder,
      ensureBus: true,
      doing: args.role === "lead" ? "lead online via team:start" : "worker online via team:start",
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

const isEntry = process.argv[1]?.replaceAll("\\", "/").endsWith("/start.js")
  || process.argv[1]?.replaceAll("\\", "/").endsWith("/start.ts");

if (isEntry) {
  void main();
}
