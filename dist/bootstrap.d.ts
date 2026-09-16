import { type Role } from "./types.js";
/** Worker idle wake: file watcher only. Do not expose as a pasteable “loop” prompt in CLI JSON. */
export declare const WORKER_WATCH_PROMPT = "Follow the team-worker skill (/team-worker). Never run timed agent loops in worker windows. Join as this window's worker id (argument C, D, ... or default B; A is lead). Omit workspaceRoot unless team_* errors. team_poll once. If team_* missing, node dist/cli.js join --agent <id> then poll. If an open order exists, claim, work, report. Then start ONE background watcher: node hooks/watch-orders.mjs --agent <id> --root <workspaceRoot> (or %USERPROFILE%\\.cursor\\plugins\\local\\cursor-agent-team\\hooks\\watch-orders.mjs). Shell notify_on_output pattern ^AGENT_TEAM_WAKE. On wake: poll, work, report; leave the watcher running. Kill the watcher only if the user asks to stop. If frozen on Allow: click Allow always, then start the watcher.";
/** @deprecated Use WORKER_WATCH_PROMPT */
export declare const WORKER_LOOP_PROMPT = "Follow the team-worker skill (/team-worker). Never run timed agent loops in worker windows. Join as this window's worker id (argument C, D, ... or default B; A is lead). Omit workspaceRoot unless team_* errors. team_poll once. If team_* missing, node dist/cli.js join --agent <id> then poll. If an open order exists, claim, work, report. Then start ONE background watcher: node hooks/watch-orders.mjs --agent <id> --root <workspaceRoot> (or %USERPROFILE%\\.cursor\\plugins\\local\\cursor-agent-team\\hooks\\watch-orders.mjs). Shell notify_on_output pattern ^AGENT_TEAM_WAKE. On wake: poll, work, report; leave the watcher running. Kill the watcher only if the user asks to stop. If frozen on Allow: click Allow always, then start the watcher.";
export declare const LEAD_HARVEST_HINT = "Harvest on user continue: team_harvest then team_status, then team_delegate if workers idle. If team_* missing, node dist/cli.js harvest --agent A then status. Do not run a timed /loop unless the user explicitly wants unattended harvest (/loop 1h max \u2014 each tick is billed).";
/** @deprecated Use LEAD_HARVEST_HINT */
export declare const LEAD_LOOP_PROMPT = "Harvest on user continue: team_harvest then team_status, then team_delegate if workers idle. If team_* missing, node dist/cli.js harvest --agent A then status. Do not run a timed /loop unless the user explicitly wants unattended harvest (/loop 1h max \u2014 each tick is billed).";
export interface StartTeamInput {
    workspaceRoot?: string;
    role?: Role;
    agentId?: string;
    doing?: string;
    seedOrder?: boolean;
    ensureBus?: boolean;
}
export interface StartTeamResult {
    ok: true;
    workspaceRoot: string;
    joined: {
        id: string;
        role: Role;
    };
    bus: {
        url: string;
        started?: boolean;
        health?: unknown;
    };
    seededOrderId: string | null;
    human: {
        leftover: string[];
        /** @deprecated Removed from JSON output — use /team-worker skill, not a pasted prompt. */
        workerLoop?: string;
        /** @deprecated Removed from JSON output — use team-lead skill. */
        leadLoop?: string;
    };
}
export declare function startTeam(input: StartTeamInput): Promise<StartTeamResult>;
export declare function parseStartArgs(argv: string[]): {
    root: string;
    role: Role;
    agentId?: string;
    seedOrder: boolean;
};
