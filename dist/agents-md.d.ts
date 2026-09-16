import type { WorkerPersona } from "./project-profile.js";
export interface AgentsMdParseResult {
    domain: string;
    summary: string;
    workers: Record<string, WorkerPersona>;
}
export declare function findAgentsMdPath(workspaceRoot: string): string | null;
export declare function readAgentsMd(workspaceRoot: string): string | null;
/** Best-effort parse of AGENTS.md worker sections (### B, ## Agent C — title, bullets). */
export declare function parseAgentsMarkdown(content: string, workerIds: string[]): AgentsMdParseResult;
/** Chat overrides win per worker id; then AGENTS.md; then defaults. */
export declare function mergeWorkerPersonas(workerIds: string[], fromAgentsMd: Record<string, WorkerPersona>, chatOverrides: Record<string, WorkerPersona> | undefined, defaults: Record<string, WorkerPersona>): Record<string, WorkerPersona>;
export declare function normalizeOverrideWorkers(raw: Record<string, {
    title: string;
    focus: string;
}> | undefined): Record<string, WorkerPersona> | undefined;
