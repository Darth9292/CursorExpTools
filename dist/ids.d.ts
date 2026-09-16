/** Canonical ids: A (lead), B-Z, then 1, 2, 3... Aliases: a, lead-a, agent-B, etc. */
export declare function canonicalizeAgentId(raw: string): string;
export declare function nextWorkerId(taken: string[]): string;
export declare function takenIds(config: {
    leadId: string;
    workers: string[];
}): string[];
