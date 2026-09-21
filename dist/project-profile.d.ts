import type { TeamConfig } from "./types.js";
export interface WorkerPersona {
    title: string;
    focus: string;
}
export interface ProjectProfile {
    domain: string;
    summary: string;
    /** Worker id (B, C, …) → specialist persona for this repo */
    workers: Record<string, WorkerPersona>;
    sources: string[];
    adaptedAt: string | null;
    /** Lead-only: respect existing user/project prompts */
    layeringNote?: string;
}
export declare const DEFAULT_LAYERING_NOTE = "Project rules (.cursor/rules), AGENTS.md, and the user's existing system prompts define domain expertise. Agent-team rules add multi-window coordination only \u2014 do not replace or contradict project instructions.";
export declare const PROJECT_PROFILE_PATH = "team/project.json";
export declare const PROJECT_MARKDOWN_PATH = "knowledge/project.md";
export declare const PROJECT_MARKDOWN_TEMPLATE = "# Project team profile\n\nEdit this file (or run `/team-adapt` in the lead chat) when the repo changes focus.\n\n## Domain\n\n(What this codebase is \u2014 e.g. PS3 reverse engineering, DayZ modding, web API.)\n\n## Summary\n\n(2\u20134 sentences the whole team should share.)\n\n## Specialists\n\nMap each worker id from `team/config.json` to a role **for this repo**. Workers read their section on every order.\n\n### B\n\n- **Title:** (e.g. Lead gameplay scripter)\n- **Focus:** (what B owns in this project)\n\n### C\n\n- **Title:**\n- **Focus:**\n\n### D\n\n- **Title:**\n- **Focus:**\n\n## Sources\n\n(List files the lead used: README, AGENTS.md, rules, etc.)\n\n## Layering\n\nProject rules (.cursor/rules), AGENTS.md, and the user's existing system prompts define domain expertise. Agent-team rules add multi-window coordination only \u2014 do not replace or contradict project instructions.\n";
export declare function isPluginDevWorkspace(workspaceRoot: string): boolean;
export declare function projectJsonPath(workspaceRoot: string): string;
export declare function readProjectProfile(workspaceRoot: string): ProjectProfile | null;
export declare function personaForWorker(profile: ProjectProfile | null, workerId: string): WorkerPersona | null;
export declare function enrichDelegateBrief(profile: ProjectProfile | null, to: string, brief: string): string;
export declare function defaultWorkersFromConfig(config: TeamConfig): Record<string, WorkerPersona>;
export declare function projectMarkdownExists(workspaceRoot: string): boolean;
export declare function renderProjectMarkdown(profile: ProjectProfile): string;
/**
 * Add a persona for a worker who just joined, without dropping anyone already in the profile.
 * AGENTS.md wins when it has a section for that id; otherwise a generic specialist is used.
 */
export declare function ensureWorkerPersona(workspaceRoot: string, workerId: string): WorkerPersona;
