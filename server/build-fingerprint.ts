import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** `dist/daemon.js` mtime — changes whenever `npm run build` updates the bus code. */
export function readDistBuildId(root = pluginRoot): number | null {
  try {
    return statSync(path.join(root, "dist", "daemon.js")).mtimeMs;
  } catch {
    return null;
  }
}

export function isDistStale(runningBuildId: unknown, root = pluginRoot): boolean {
  if (typeof runningBuildId !== "number" || !Number.isFinite(runningBuildId)) {
    return false;
  }
  const local = readDistBuildId(root);
  return local !== null && Math.round(local) !== Math.round(runningBuildId);
}
