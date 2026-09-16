import { existsSync } from "node:fs";
import path from "node:path";

export function resolveWorkspaceRoot(
  explicit?: string,
  cwd = process.cwd(),
  knownRoots: string[] = [],
): string {
  const raw = explicit?.trim();
  if (raw) return path.resolve(raw);
  if (existsSync(path.join(cwd, "team", "config.json"))) {
    return path.resolve(cwd);
  }
  if (knownRoots.length === 1) {
    return knownRoots[0];
  }
  throw new Error(
    `workspaceRoot omitted and cannot be inferred (cwd ${cwd} has no team/config.json, and ${knownRoots.length} workspaces are on the bus). Run pwd in this workspace and pass that path. Never ask the human to paste a file path.`,
  );
}
