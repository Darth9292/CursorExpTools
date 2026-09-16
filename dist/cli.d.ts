#!/usr/bin/env node
import { type OrderMode, type Role } from "./types.js";
export type CliCommand = "harvest" | "status" | "delegate" | "poll" | "claim" | "report" | "join";
export interface CliArgs {
    command: CliCommand;
    root?: string;
    agent: string;
    to?: string;
    title?: string;
    brief?: string;
    doneWhen?: string;
    claim?: string[];
    mode: OrderMode;
    order?: string;
    body?: string;
    reportStatus?: "done" | "blocked";
    role?: Role;
}
export declare function parseCliArgs(argv: string[]): CliArgs;
export declare function runCli(argv: string[], cwd?: string): Promise<unknown>;
