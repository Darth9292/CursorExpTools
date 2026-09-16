import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveNpmInstall } from "../scripts/link-local.mjs";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const execPath = path.join("C:", "Program Files", "nodejs", "node.exe");
const npmCli = path.join("C:", "Program Files", "nodejs", "node_modules", "npm", "bin", "npm-cli.js");
const npmCmd = path.join("C:", "Program Files", "nodejs", "npm.cmd");
const unixNode = path.join("/usr", "bin", "node");
const unixNpm = path.join("/usr", "bin", "npm");

describe("plugin package payload", () => {
  it("ships hooks/watch-orders.mjs via package files[]", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(repoRoot, "package.json"), "utf8"),
    ) as { files?: string[] };
    const files = pkg.files ?? [];
    const includesWatcher =
      files.includes("hooks/watch-orders.mjs") || files.includes("hooks");
    expect(includesWatcher).toBe(true);
    expect(existsSync(path.join(repoRoot, "hooks", "watch-orders.mjs"))).toBe(true);
  });
});

describe("resolveNpmInstall", () => {
  it("on Windows prefers node + npm-cli.js when that file exists", () => {
    const resolved = resolveNpmInstall({
      execPath,
      platform: "win32",
      exists: (p: string) => p === npmCli,
    });
    expect(resolved).toEqual({
      command: execPath,
      args: [npmCli, "install", "--omit=dev", "--ignore-scripts"],
      shell: false,
    });
  });

  it("on Windows falls back to npm.cmd without shell", () => {
    const resolved = resolveNpmInstall({
      execPath,
      platform: "win32",
      exists: () => false,
    });
    expect(resolved).toEqual({
      command: npmCmd,
      args: ["install", "--omit=dev", "--ignore-scripts"],
      shell: false,
    });
  });

  it("on unix uses npm next to node without shell", () => {
    const resolved = resolveNpmInstall({
      execPath: unixNode,
      platform: "linux",
      exists: () => false,
    });
    expect(resolved).toEqual({
      command: unixNpm,
      args: ["install", "--omit=dev", "--ignore-scripts"],
      shell: false,
    });
  });
});
