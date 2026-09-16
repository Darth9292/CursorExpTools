#!/usr/bin/env node
import { readProjectProfile } from "./project-profile.js";
import { suggestWorkers, topWorkerSuggestion } from "./suggest-worker.js";
import { TeamStore } from "./store.js";
import { resolveWorkspaceRoot } from "./workspace.js";

export interface SuggestWorkerCliArgs {
  root?: string;
  claim: string[];
  hint?: string;
}

function takeValue(argv: string[], i: number, flag: string): { value: string; next: number } {
  const value = argv[i + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return { value, next: i + 1 };
}

export function parseSuggestWorkerCliArgs(argv: string[]): SuggestWorkerCliArgs {
  const args: SuggestWorkerCliArgs = { claim: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") {
      const t = takeValue(argv, i, a);
      args.root = t.value;
      i = t.next;
    } else if (a === "--claim") {
      const t = takeValue(argv, i, a);
      args.claim.push(
        ...t.value
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
      );
      i = t.next;
    } else if (a === "--hint") {
      const t = takeValue(argv, i, a);
      args.hint = t.value;
      i = t.next;
    } else {
      throw new Error(`Unknown flag '${a}'`);
    }
  }
  return args;
}

export async function runSuggestWorkerCli(argv: string[], cwd = process.cwd()): Promise<unknown> {
  const args = parseSuggestWorkerCliArgs(argv);
  const root = resolveWorkspaceRoot(args.root, cwd);
  const store = new TeamStore(root);
  const config = await store.requireEnabled();
  const profile = readProjectProfile(store.root);
  const workerIds = config.workers.length > 0 ? config.workers : ["B"];
  const ranked = suggestWorkers({
    claim: args.claim,
    hint: args.hint,
    workerIds,
    profile,
  });
  const suggested = topWorkerSuggestion(ranked);
  return {
    workspaceRoot: store.root,
    ranked,
    suggested,
    note: suggested
      ? `Clear pick: worker ${suggested.id}. If scores tie, choose by load or ask the human.`
      : "No clear pick — check ranked scores or override manually.",
  };
}

async function main(): Promise<void> {
  try {
    const result = await runSuggestWorkerCli(process.argv.slice(2));
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

const isEntry =
  process.argv[1]?.replaceAll("\\", "/").endsWith("/suggest-worker-cli.js") ||
  process.argv[1]?.replaceAll("\\", "/").endsWith("/suggest-worker-cli.ts");

if (isEntry) {
  void main();
}
