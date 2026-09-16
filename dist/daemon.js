#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { readDistBuildId } from "./build-fingerprint.js";
import { registerTeamTools, workspaceKeys } from "./mcp-tools.js";
import { DEFAULT_PORT } from "./types.js";
export const VERSION = "1.0.0";
const DAEMON_STARTED_AT = new Date().toISOString();
const DAEMON_BUILD_ID = readDistBuildId();
function createServer() {
    const server = new McpServer({ name: "cursor-agent-team", version: VERSION }, { capabilities: { tools: {} } });
    registerTeamTools(server);
    return server;
}
export function parsePort(argv = process.argv.slice(2), env = process.env) {
    const flag = argv.findIndex((a) => a === "--port");
    if (flag >= 0 && argv[flag + 1]) {
        return Number(argv[flag + 1]);
    }
    if (env.AGENT_TEAM_PORT)
        return Number(env.AGENT_TEAM_PORT);
    return DEFAULT_PORT;
}
export function logPath(port) {
    return path.join(os.tmpdir(), `cursor-agent-team-${port}.log`);
}
export async function startDaemon(port = DEFAULT_PORT) {
    const app = express();
    app.use(express.json({ limit: "4mb" }));
    app.use((req, res, next) => {
        const host = (req.headers.host ?? "").split(":")[0]?.toLowerCase();
        if (host && host !== "127.0.0.1" && host !== "localhost") {
            res.status(403).json({ error: "forbidden host" });
            return;
        }
        next();
    });
    const transports = {};
    app.get("/health", (_req, res) => {
        res.json({
            ok: true,
            name: "cursor-agent-team",
            version: VERSION,
            port,
            workspaces: workspaceKeys(),
            buildId: DAEMON_BUILD_ID,
            startedAt: DAEMON_STARTED_AT,
        });
    });
    const mcpHandler = async (req, res) => {
        const sessionId = req.headers["mcp-session-id"];
        try {
            if (sessionId && transports[sessionId]) {
                await transports[sessionId].handleRequest(req, res, req.body);
                return;
            }
            if (!sessionId && req.method === "POST" && isInitializeRequest(req.body)) {
                let transport;
                transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => randomUUID(),
                    onsessioninitialized: (id) => {
                        transports[id] = transport;
                    },
                    onsessionclosed: (id) => {
                        delete transports[id];
                    },
                });
                transport.onclose = () => {
                    const sid = transport.sessionId;
                    if (sid)
                        delete transports[sid];
                };
                const server = createServer();
                await server.connect(transport);
                await transport.handleRequest(req, res, req.body);
                return;
            }
            if (sessionId) {
                res.status(404).json({
                    jsonrpc: "2.0",
                    error: { code: -32001, message: "Session not found" },
                    id: null,
                });
                return;
            }
            res.status(400).json({
                jsonrpc: "2.0",
                error: { code: -32000, message: "Bad Request: Session ID required" },
                id: null,
            });
        }
        catch (err) {
            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: "2.0",
                    error: { code: -32603, message: err instanceof Error ? err.message : String(err) },
                    id: null,
                });
            }
        }
    };
    app.post("/mcp", mcpHandler);
    app.get("/mcp", mcpHandler);
    app.delete("/mcp", mcpHandler);
    const httpServer = await new Promise((resolve, reject) => {
        const s = app.listen(port, "127.0.0.1", () => resolve(s));
        s.on("error", reject);
    });
    const close = async () => {
        for (const t of Object.values(transports)) {
            await t.close().catch(() => undefined);
        }
        await new Promise((resolve, reject) => {
            httpServer.close((err) => (err ? reject(err) : resolve()));
        });
    };
    return { app, close };
}
async function main() {
    const port = parsePort();
    const logFile = logPath(port);
    await mkdir(path.dirname(logFile), { recursive: true });
    if (process.env.AGENT_TEAM_LOG === "1") {
        const out = createWriteStream(logFile, { flags: "a" });
        process.stdout.write = out.write.bind(out);
        process.stderr.write = out.write.bind(out);
    }
    try {
        await startDaemon(port);
        console.log(`cursor-agent-team listening on http://127.0.0.1:${port}/mcp`);
        console.log(`health: http://127.0.0.1:${port}/health`);
    }
    catch (err) {
        const code = err.code;
        if (code === "EADDRINUSE") {
            console.error(`Port ${port} is already in use. If the team bus is already running, that is OK.`);
            process.exit(0);
        }
        console.error(err);
        process.exit(1);
    }
}
const isEntry = process.argv[1]?.replaceAll("\\", "/").endsWith("/daemon.js")
    || process.argv[1]?.replaceAll("\\", "/").endsWith("/daemon.ts");
if (isEntry) {
    void main();
}
//# sourceMappingURL=daemon.js.map