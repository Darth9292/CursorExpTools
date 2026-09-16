import { z } from "zod";
import { TeamStore } from "./store.js";
import { startTeam } from "./bootstrap.js";
import { adaptProject } from "./adapt-project.js";
import { enrichDelegateBrief, personaForWorker, readProjectProfile } from "./project-profile.js";
import { suggestWorkers, topWorkerSuggestion } from "./suggest-worker.js";
import { resolveWorkspaceRoot } from "./workspace.js";
const stores = new Map();
export function workspaceKeys() {
    return [...stores.keys()];
}
export function storeFor(workspaceRoot) {
    const root = resolveWorkspaceRoot(workspaceRoot, process.cwd(), [...stores.keys()]);
    let store = stores.get(root);
    if (!store) {
        store = new TeamStore(root);
        stores.set(root, store);
    }
    return store;
}
function jsonResult(data) {
    return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
}
function errorResult(err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
        isError: true,
        content: [{ type: "text", text: message }],
    };
}
/** Join/status board: drop done-order briefs and resultBodies so Cursor is not flooded. */
export function withWorkspaceRoot(store, payload) {
    return { workspaceRoot: store.root, ...payload };
}
export function compactBoardForMcp(board) {
    return {
        ...board,
        orders: board.orders.map((order) => {
            if (order.status !== "done")
                return order;
            return {
                id: order.id,
                to: order.to,
                status: order.status,
                title: order.title,
                resultPath: order.resultPath,
                updatedAt: order.updatedAt,
            };
        }),
    };
}
/** Status/join: drop done orders entirely — use team_harvest for completed work. */
export function activeOrdersForMcp(board) {
    return {
        ...board,
        orders: board.orders.filter((o) => o.status === "open" || o.status === "claimed"),
    };
}
export function boardSnapshotForMcp(board) {
    return compactBoardForMcp(activeOrdersForMcp(board));
}
/** team_join response body before workspaceRoot: omit board when includeBoard is false (heartbeat joins). */
export function joinPayloadForMcp(joined, board, includeBoard) {
    const payload = { joined };
    if (includeBoard !== false) {
        payload.board = boardSnapshotForMcp(board);
    }
    return payload;
}
const workspaceRoot = z
    .string()
    .min(1)
    .optional()
    .describe("Project root. Omit when possible: inferred from pwd if team/config.json exists, or the only workspace on the bus. Never ask the human to paste a path.");
const agentId = z.string().min(1).describe("This window's agent id: A (lead), B-Z, then 1, 2, 3...");
export function registerTeamTools(server) {
    server.tool("team_start", "Lead one-shot: scaffold team/, ensure this chat joins as lead (default), optional seed worker order. Call this when the user wants the team running. Daemon must already be up (MCP connected) or pass ensureBus via CLI instead.", {
        workspaceRoot,
        agentId: agentId.optional(),
        role: z.enum(["lead", "worker"]).optional(),
        seedOrder: z
            .boolean()
            .optional()
            .describe("If true and no open orders, create a dogfood backlog order for worker b"),
    }, async (args) => {
        try {
            const result = await startTeam({
                workspaceRoot: args.workspaceRoot,
                agentId: args.agentId,
                role: args.role,
                seedOrder: args.seedOrder ?? true,
                ensureBus: false,
                doing: "lead online via team_start",
            });
            return jsonResult(result);
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_scaffold", "Create team/ and knowledge/ files in a project. Does not require join. Use from /team-init.", { workspaceRoot }, async ({ workspaceRoot: root }) => {
        try {
            const store = storeFor(root);
            await store.scaffold();
            const config = await store.readConfig();
            return jsonResult({ ok: true, teamDir: store.teamDir, config });
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_join", "Register this Cursor chat as lead or worker on the team bus. Call before other team tools.", {
        workspaceRoot,
        agentId,
        role: z.enum(["lead", "worker"]).describe("lead talks to the user; worker only executes orders"),
        doing: z.string().optional().describe("Short heartbeat of what this agent is doing"),
        includeBoard: z
            .boolean()
            .optional()
            .describe("If false, omit board from the response (heartbeat-only join). Default true."),
    }, async (args) => {
        try {
            const store = storeFor(args.workspaceRoot);
            const config = await store.readConfig();
            if (!config) {
                await store.scaffold();
            }
            const agent = await store.join(args.agentId, args.role, args.doing ?? "joined");
            const payload = joinPayloadForMcp(agent, await store.getBoard(), args.includeBoard);
            return jsonResult(withWorkspaceRoot(store, payload));
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_whoami", "Return this agent's join record.", { workspaceRoot, agentId }, async (args) => {
        try {
            return jsonResult(await storeFor(args.workspaceRoot).whoami(args.agentId));
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_status", "Board snapshot: agents, open/claimed orders only, active claims, config. Done work: team_harvest.", { workspaceRoot }, async (args) => {
        try {
            return jsonResult(boardSnapshotForMcp(await storeFor(args.workspaceRoot).getBoard()));
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_inbox_read", "Read the latest inbox messages.", {
        workspaceRoot,
        limit: z.number().int().min(1).max(200).optional(),
    }, async (args) => {
        try {
            return jsonResult(await storeFor(args.workspaceRoot).inboxRead(args.limit ?? 30));
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_inbox_send", "Send a team inbox message.", {
        workspaceRoot,
        agentId,
        to: z.string().min(1).describe("Target agent id or *"),
        type: z.enum(["finding", "question", "answer", "handoff", "blocked"]),
        body: z.string().min(1),
        re: z.string().optional().describe("Related order or message id"),
    }, async (args) => {
        try {
            const msg = await storeFor(args.workspaceRoot).inboxSend({
                from: args.agentId,
                to: args.to,
                type: args.type,
                re: args.re,
                body: args.body,
            });
            return jsonResult(msg);
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_publish_finding", "Broadcast a durable finding to the inbox (optionally pointing at a knowledge/ path).", {
        workspaceRoot,
        agentId,
        title: z.string().min(1),
        body: z.string().min(1),
        path: z.string().optional(),
    }, async (args) => {
        try {
            return jsonResult(await storeFor(args.workspaceRoot).publishFinding({
                from: args.agentId,
                title: args.title,
                body: args.body,
                path: args.path,
            }));
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_claim_paths", "Lease file paths so other agents do not write them.", {
        workspaceRoot,
        agentId,
        paths: z.array(z.string()).min(1),
        orderId: z.string().optional(),
        ttlMs: z.number().int().positive().optional(),
    }, async (args) => {
        try {
            return jsonResult(await storeFor(args.workspaceRoot).claimPaths(args.agentId, args.paths, args.orderId ?? null, args.ttlMs));
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_release_paths", "Release path leases owned by this agent.", {
        workspaceRoot,
        agentId,
        paths: z.array(z.string()).min(1),
    }, async (args) => {
        try {
            return jsonResult(await storeFor(args.workspaceRoot).releasePaths(args.agentId, args.paths));
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_suggest_worker", "Lead only. Rank workers for a delegate slice from claim paths and optional hint. Read-only; call before team_delegate.", {
        workspaceRoot,
        agentId,
        claim: z.array(z.string()).optional(),
        hint: z.string().optional().describe("Extra keywords, e.g. 'bus restart' or 'README'"),
    }, async (args) => {
        try {
            const store = storeFor(args.workspaceRoot);
            await store.requireRole(args.agentId, "lead");
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
            return jsonResult(withWorkspaceRoot(store, {
                ranked,
                suggested,
                note: suggested
                    ? `Clear pick: worker ${suggested.id}. If scores tie, choose by load or ask the human.`
                    : "No clear pick — check ranked scores or override manually.",
            }));
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_delegate", "Lead only. Create an order for a worker. Use parallel to keep working; assist for help; handoff to give the slice away.", {
        workspaceRoot,
        agentId,
        to: z.string().min(1).describe("Worker id, usually b"),
        mode: z.enum(["parallel", "assist", "handoff"]),
        title: z.string().min(1),
        brief: z.string().min(1),
        doneWhen: z.string().min(1),
        claim: z.array(z.string()).optional(),
    }, async (args) => {
        try {
            const store = storeFor(args.workspaceRoot);
            const profile = readProjectProfile(store.root);
            const brief = enrichDelegateBrief(profile, args.to, args.brief);
            const order = await store.delegate({
                from: args.agentId,
                to: args.to,
                mode: args.mode,
                title: args.title,
                brief,
                doneWhen: args.doneWhen,
                claim: args.claim,
            });
            return jsonResult({
                order,
                note: args.mode === "parallel"
                    ? "Worker wakes when orders.json gets a new open order for them (file watcher). Continue your own task now."
                    : args.mode === "assist"
                        ? "Worker will investigate and report. You stay the one who talks to the user."
                        : "You stopped this slice; the worker owns it until done.",
            });
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_harvest", "Lead only. Return new done/blocked worker results since last harvest.", { workspaceRoot, agentId }, async (args) => {
        try {
            const results = await storeFor(args.workspaceRoot).harvest(args.agentId);
            return jsonResult({ count: results.length, orders: results });
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_cancel", "Lead only. Cancel an order.", { workspaceRoot, agentId, orderId: z.string().min(1) }, async (args) => {
        try {
            return jsonResult(await storeFor(args.workspaceRoot).cancel(args.agentId, args.orderId));
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_nudge", "Lead only. Ping a worker via the inbox.", {
        workspaceRoot,
        agentId,
        to: z.string().min(1),
        body: z.string().min(1),
    }, async (args) => {
        try {
            return jsonResult(await storeFor(args.workspaceRoot).nudge(args.agentId, args.to, args.body));
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_poll", "Worker only. List open or claimed orders for this worker.", { workspaceRoot, agentId }, async (args) => {
        try {
            const store = storeFor(args.workspaceRoot);
            const orders = await store.poll(args.agentId);
            await store.heartbeat(args.agentId, orders.length ? `polled, ${orders.length} order(s)` : "idle");
            const profile = readProjectProfile(store.root);
            const persona = personaForWorker(profile, args.agentId);
            return jsonResult(withWorkspaceRoot(store, {
                count: orders.length,
                orders,
                persona,
                projectMarkdown: profile ? "knowledge/project.md" : null,
            }));
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_adapt", "Lead only. Build team/project.json from AGENTS.md, merged with optional overrides (chat beats file). Writes knowledge/project.md.", {
        workspaceRoot,
        agentId,
        domain: z.string().optional(),
        summary: z.string().optional(),
        workers: z
            .record(z.object({
            title: z.string().min(1),
            focus: z.string().min(1),
        }))
            .optional()
            .describe("Per worker id (B, C, …). Overrides AGENTS.md for those ids."),
    }, async (args) => {
        try {
            const store = storeFor(args.workspaceRoot);
            const result = await adaptProject(store, args.agentId, {
                domain: args.domain,
                summary: args.summary,
                workers: args.workers,
            });
            return jsonResult(withWorkspaceRoot(store, {
                ...result,
                priority: "chat overrides > AGENTS.md > defaults",
            }));
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_read_project", "Read team/project.json profile (domain, worker personas). Lead uses before delegating; workers see persona on team_poll.", { workspaceRoot }, async (args) => {
        try {
            const store = storeFor(args.workspaceRoot);
            const profile = readProjectProfile(store.root);
            return jsonResult(withWorkspaceRoot(store, {
                profile,
                markdownPath: "knowledge/project.md",
                layering: "Existing project rules and user prompts stay authoritative; team protocol is coordination only.",
            }));
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_claim_order", "Worker only. Claim an open order before working it.", { workspaceRoot, agentId, orderId: z.string().min(1) }, async (args) => {
        try {
            return jsonResult(await storeFor(args.workspaceRoot).claimOrder(args.agentId, args.orderId));
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_report", "Worker only. Finish an order as done or blocked and write team/results/<id>.md.", {
        workspaceRoot,
        agentId,
        orderId: z.string().min(1),
        status: z.enum(["done", "blocked"]),
        body: z.string().min(1),
    }, async (args) => {
        try {
            return jsonResult(await storeFor(args.workspaceRoot).report(args.agentId, args.orderId, args.status, args.body));
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool("team_ask_lead", "Worker only. Block the order and ask the lead a question.", {
        workspaceRoot,
        agentId,
        orderId: z.string().min(1),
        question: z.string().min(1),
    }, async (args) => {
        try {
            return jsonResult(await storeFor(args.workspaceRoot).askLead(args.agentId, args.orderId, args.question));
        }
        catch (err) {
            return errorResult(err);
        }
    });
}
//# sourceMappingURL=mcp-tools.js.map