import { type AgentStatus, type Claim, type InboxMessage, type InboxType, type Order, type OrderMode, type Role, type TeamConfig } from "./types.js";
export declare const RESULT_BODY_CAP = 240;
export declare const INBOX_KEEP_LINES = 100;
export declare const INBOX_MAX_BODY_CHARS = 16384;
export declare const KEEP_DONE_ORDERS = 50;
export declare const TEAM_README = "# Agent team board\n\nThis folder is the shared radio for Cursor IDE windows on this project.\n\n- You talk only to the **lead** chat (`/team-lead`).\n- Extra windows run `/team-worker` and wait on `hooks/watch-orders.mjs` (not a timed `/loop`).\n- Durable facts go in `knowledge/`. Chatty coordination stays here.\n\n## Files\n\n- `config.json` \u2014 enable flag, bus port, lead/worker ids\n- `status.json` \u2014 per-agent heartbeat\n- `orders.json` \u2014 lead-issued work\n- `inbox.jsonl` \u2014 questions, answers, findings\n- `claims.json` \u2014 path leases (default 30 minutes)\n- `results/<orderId>.md` \u2014 worker write-ups\n- `harvest.json` \u2014 lead harvest cursors\n- `project.json` \u2014 specialist personas (from `/team-adapt`)\n- `watchers/<id>.pid` \u2014 local watcher PIDs (gitignored)\n\n## Order modes\n\n- `parallel` \u2014 worker does Y while lead continues X\n- `assist` \u2014 worker investigates; lead stays owner of the user conversation\n- `handoff` \u2014 worker becomes owner of that slice until done\n";
export declare const KNOWLEDGE_README = "# Knowledge\n\nDurable facts for this project (symbols, structs, decisions).\nThe agent-team plugin does not interpret these files; they are a convention.\n\n- `project.md` \u2014 domain summary and per-worker specialist roles for this repo (see `/team-adapt` in the lead chat).\n";
export declare class TeamStore {
    readonly root: string;
    readonly teamDir: string;
    /** Lines in inbox.jsonl after the last read or rotate. Null until known. */
    private inboxLineCount;
    constructor(workspaceRoot: string);
    scaffold(): Promise<void>;
    readConfig(): Promise<TeamConfig | null>;
    requireEnabled(): Promise<TeamConfig>;
    join(agentId: string, role: Role, doing?: string): Promise<AgentStatus>;
    whoami(agentId: string): Promise<AgentStatus>;
    getBoard(): Promise<{
        config: TeamConfig;
        agents: AgentStatus[];
        orders: Order[];
        claims: Claim[];
    }>;
    heartbeat(agentId: string, doing?: string, lastResult?: string): Promise<AgentStatus>;
    delegate(input: {
        from: string;
        to: string;
        mode: OrderMode;
        title: string;
        brief: string;
        claim?: string[];
        doneWhen: string;
    }): Promise<Order>;
    poll(workerId: string): Promise<Order[]>;
    claimOrder(workerId: string, orderId: string): Promise<Order>;
    report(workerId: string, orderId: string, status: "done" | "blocked", body: string): Promise<Order>;
    askLead(workerId: string, orderId: string, question: string): Promise<{
        order: Order;
        message: InboxMessage;
    }>;
    harvest(leadId: string): Promise<Pick<Order, "id" | "to" | "title" | "status" | "resultBody" | "resultPath" | "updatedAt">[]>;
    cancel(leadId: string, orderId: string): Promise<Order>;
    nudge(leadId: string, workerId: string, body: string): Promise<InboxMessage>;
    inboxSend(input: {
        from: string;
        to: string;
        type: InboxType;
        re?: string | null;
        body: string;
    }): Promise<InboxMessage>;
    inboxRead(limit?: number): Promise<InboxMessage[]>;
    publishFinding(input: {
        from: string;
        title: string;
        body: string;
        path?: string;
    }): Promise<InboxMessage>;
    claimPaths(agentId: string, paths: string[], orderId: string | null, ttlMs?: number): Promise<Claim[]>;
    releasePaths(agentId: string, paths: string[]): Promise<Claim[]>;
    expireClaims(): Promise<Claim[]>;
    private mergeGitignore;
    private withLock;
    private ensureLockFile;
    private ensureAgentAllowed;
    private saveConfig;
    private requireAgent;
    requireRole(agentId: string, role: Role): Promise<AgentStatus>;
    /** Returns true when doing or lastResult changed and ts was refreshed. */
    private assignAgentActivity;
    private touchAgent;
    private loadStatus;
    private saveStatus;
    private loadOrders;
    private saveOrders;
    private loadClaims;
    private saveClaims;
    private activeClaims;
    private upsertClaims;
    private releaseClaimsFor;
    private appendInboxUnlocked;
    private rotateInboxUnlocked;
}
