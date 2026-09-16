import { readFile } from "node:fs/promises";
import { adaptProject, type AdaptProjectInput } from "./adapt-project.js";
import { TeamStore } from "./store.js";
import { resolveWorkspaceRoot } from "./workspace.js";

function parseArgv(argv: string[]) {
  let root = process.cwd();
  let agentId = "A";
  let workersJson: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root" && argv[i + 1]) root = argv[++i];
    else if ((a === "--agent" || a === "--agent-id") && argv[i + 1]) agentId = argv[++i];
    else if (a === "--workers-json" && argv[i + 1]) workersJson = argv[++i];
  }
  return { root, agentId, workersJson };
}

async function main() {
  const { root, agentId, workersJson } = parseArgv(process.argv.slice(2));
  const workspace = resolveWorkspaceRoot(root);
  const store = new TeamStore(workspace);
  let input: AdaptProjectInput = {};
  if (workersJson) {
    input = JSON.parse(await readFile(workersJson, "utf8")) as AdaptProjectInput;
  }
  await store.join(agentId, "lead", "team:adapt");
  const result = await adaptProject(store, agentId, input);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
