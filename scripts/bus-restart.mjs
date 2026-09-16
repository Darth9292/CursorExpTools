/**
 * Kill the listener on the team bus port, then ensure a fresh daemon (loads latest dist/).
 */
import { readFileSync, statSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readPort() {
  const configPath = path.join(process.cwd(), "team", "config.json");
  try {
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    return Number(config.port) || 7391;
  } catch {
    return Number(process.env.AGENT_TEAM_PORT) || 7391;
  }
}

function killPort(port) {
  if (process.platform === "win32") {
    try {
      const out = execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"`,
        { encoding: "utf8", windowsHide: true },
      ).trim();
      for (const line of out.split(/\s+/).filter(Boolean)) {
        const pid = Number(line);
        if (pid > 0 && pid !== process.pid) {
          try {
            process.kill(pid);
          } catch {
            /* already gone */
          }
        }
      }
    } catch {
      /* nothing listening */
    }
    return;
  }
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: "utf8" }).trim();
    for (const pid of out.split("\n").filter(Boolean)) {
      try {
        process.kill(Number(pid));
      } catch {
        /* */
      }
    }
  } catch {
    /* nothing listening */
  }
}

async function main() {
  const port = readPort();
  killPort(port);
  await new Promise((r) => setTimeout(r, 300));
  const ensure = path.join(pluginRoot, "dist", "ensure-daemon.js");
  const ensured = spawnSync(process.execPath, [ensure, "--port", String(port)], {
    stdio: "inherit",
    cwd: process.cwd(),
    env: { ...process.env, AGENT_TEAM_PORT: String(port) },
  });
  if (ensured.status !== 0) {
    process.exit(ensured.status ?? 1);
  }
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(2000) });
    const health = await res.json();
    let localBuildId = null;
    try {
      localBuildId = statSync(path.join(pluginRoot, "dist", "daemon.js")).mtimeMs;
    } catch {
      /* */
    }
    const distStale =
      typeof health.buildId === "number" &&
      typeof localBuildId === "number" &&
      Math.round(health.buildId) !== Math.round(localBuildId);
    console.log(JSON.stringify({ ok: true, port, health, distStale, localBuildId }, null, 2));
    console.error(
      "\n[agent-team] Bus is up. Cursor MCP sessions do NOT survive a port kill.\n" +
        "  → Developer: Reload Window in every chat that uses agent-team, OR\n" +
        "  → Settings → MCP → agent-team → disable then enable.\n" +
        "Until then you may see fetch failed / Not connected in MCP logs.\n",
    );
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
