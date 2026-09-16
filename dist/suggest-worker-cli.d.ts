#!/usr/bin/env node
export interface SuggestWorkerCliArgs {
    root?: string;
    claim: string[];
    hint?: string;
}
export declare function parseSuggestWorkerCliArgs(argv: string[]): SuggestWorkerCliArgs;
export declare function runSuggestWorkerCli(argv: string[], cwd?: string): Promise<unknown>;
