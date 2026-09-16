export declare function parsePort(argv?: string[], env?: NodeJS.ProcessEnv): number;
export declare function health(port: number): Promise<{
    ok: boolean;
    body?: unknown;
}>;
export declare function daemonScript(): string;
export declare function ensureDaemon(port?: number, timeoutMs?: number): Promise<{
    ok: boolean;
    started: boolean;
    url: string;
    health?: unknown;
    error?: string;
    hint?: string;
    distStale?: boolean;
    localBuildId?: number | null;
}>;
