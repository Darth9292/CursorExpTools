#!/usr/bin/env node
import express from "express";
export declare const VERSION = "1.0.0";
export declare function parsePort(argv?: string[], env?: NodeJS.ProcessEnv): number;
export declare function logPath(port: number): string;
export declare function startDaemon(port?: number): Promise<{
    app: express.Express;
    close: () => Promise<void>;
}>;
