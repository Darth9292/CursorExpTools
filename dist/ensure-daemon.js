import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDistStale, readDistBuildId } from "./build-fingerprint.js";
import { DEFAULT_PORT } from "./types.js";
const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export function parsePort(argv = process.argv.slice(2), env = process.env) {
    const flag = argv.findIndex((a) => a === "--port");
    if (flag >= 0 && argv[flag + 1])
        return Number(argv[flag + 1]);
    if (env.AGENT_TEAM_PORT)
        return Number(env.AGENT_TEAM_PORT);
    return DEFAULT_PORT;
}
export async function health(port) {
    try {
        const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(800) });
        if (!res.ok)
            return { ok: false };
        return { ok: true, body: await res.json() };
    }
    catch {
        return { ok: false };
    }
}
export function daemonScript() {
    const compiled = path.join(pluginRoot, "dist", "daemon.js");
    if (!existsSync(compiled)) {
        throw new Error(`Missing ${compiled}. Run npm run build in the plugin repo.`);
    }
    return compiled;
}
export async function ensureDaemon(port = DEFAULT_PORT, timeoutMs = 4000) {
    const url = `http://127.0.0.1:${port}`;
    const localBuildId = readDistBuildId();
    const existing = await health(port);
    if (existing.ok) {
        const running = existing.body;
        const distStale = isDistStale(running?.buildId);
        const hint = distStale
            ? "dist is newer than the running bus — kill the process on this port, then ensure:bus (MCP tools like team_adapt need a fresh listener)"
            : "live listener reused; kill the process on this port then ensure:bus to load new dist";
        return {
            ok: true,
            started: false,
            url: `${url}/mcp`,
            health: existing.body,
            hint,
            distStale,
            localBuildId,
        };
    }
    const script = daemonScript();
    const child = spawn(process.execPath, [script, "--port", String(port)], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
        env: { ...process.env, AGENT_TEAM_PORT: String(port), AGENT_TEAM_LOG: "1" },
        cwd: pluginRoot,
    });
    child.unref();
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const check = await health(port);
        if (check.ok) {
            return { ok: true, started: true, url: `${url}/mcp`, health: check.body };
        }
        await new Promise((r) => setTimeout(r, 150));
    }
    return {
        ok: false,
        started: true,
        url: `${url}/mcp`,
        error: `Daemon did not become healthy on ${url}/health within ${timeoutMs}ms`,
    };
}
async function main() {
    const result = await ensureDaemon(parsePort());
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
}
const isEntry = process.argv[1]?.replaceAll("\\", "/").endsWith("/ensure-daemon.js")
    || process.argv[1]?.replaceAll("\\", "/").endsWith("/ensure-daemon.ts");
if (isEntry) {
    void main();
}
//# sourceMappingURL=ensure-daemon.js.map