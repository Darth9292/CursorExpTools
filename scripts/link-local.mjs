import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dest = path.join(os.homedir(), ".cursor", "plugins", "local", "cursor-agent-team");

const copyEntries = [
  ".cursor-plugin",
  "mcp.json",
  "package.json",
  "hooks",
  "rules",
  "skills",
  "commands",
  "agents",
  "README.md",
  "LICENSE",
  "AGENTS.md",
  "dist",
];

const npmInstallArgs = ["install", "--omit=dev", "--ignore-scripts"];

export function resolveNpmInstall({ execPath, platform, exists }) {
  const npmDir = path.dirname(execPath);
  const npmCli = path.join(npmDir, "node_modules", "npm", "bin", "npm-cli.js");
  const npmBin = path.join(npmDir, platform === "win32" ? "npm.cmd" : "npm");
  if (platform === "win32" && exists(npmCli)) {
    return { command: execPath, args: [npmCli, ...npmInstallArgs], shell: false };
  }
  return { command: npmBin, args: npmInstallArgs, shell: false };
}

function main() {
  if (!existsSync(path.join(pluginRoot, "dist", "daemon.js"))) {
    console.error("dist/daemon.js missing. Run npm run build first.");
    process.exit(1);
  }

  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });

  for (const entry of copyEntries) {
    const from = path.join(pluginRoot, entry);
    if (!existsSync(from)) continue;
    cpSync(from, path.join(dest, entry), { recursive: true });
  }

  const lockfile = path.join(pluginRoot, "package-lock.json");
  if (existsSync(lockfile)) {
    cpSync(lockfile, path.join(dest, "package-lock.json"));
  }

  const { command, args, shell } = resolveNpmInstall({
    execPath: process.execPath,
    platform: process.platform,
    exists: existsSync,
  });
  const npm = spawnSync(command, args, { cwd: dest, shell, stdio: "inherit" });
  if (npm.status !== 0) {
    process.exit(npm.status ?? 1);
  }

  console.log(`Installed local plugin copy at:\n  ${dest}`);
  console.log("Reload the Cursor window, then enable the agent-team MCP after /team-bus-start (or a session in a team-enabled repo).");
}

const isEntry =
  process.argv[1]?.replaceAll("\\", "/").endsWith("/link-local.mjs");

if (isEntry) {
  main();
}
