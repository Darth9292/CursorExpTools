import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function packDryRunListing(): string {
  const r = spawnSync("npm", ["pack", "--dry-run"], {
    cwd: repoRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || "npm pack --dry-run failed");
  }
  return `${r.stdout ?? ""}${r.stderr ?? ""}`;
}

describe("npm pack payload", () => {
  it("includes dist and watch-orders; excludes live team board", () => {
    const out = packDryRunListing();
    expect(out).toMatch(/dist\/cli\.js/);
    expect(out).toMatch(/hooks\/watch-orders\.mjs/);
    expect(out).not.toMatch(/team\/orders\.json/);
  });
});
