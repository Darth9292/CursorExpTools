import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TeamStore } from "./store.js";
import type { Order } from "./types.js";
export declare function workspaceKeys(): string[];
export declare function storeFor(workspaceRoot?: string): TeamStore;
/** Join/status board: drop done-order briefs and resultBodies so Cursor is not flooded. */
export declare function withWorkspaceRoot<T extends Record<string, unknown>>(store: TeamStore, payload: T): T & {
    workspaceRoot: string;
};
export declare function compactBoardForMcp<T extends {
    orders: Order[];
}>(board: T): T;
/** Status/join: drop done orders entirely — use team_harvest for completed work. */
export declare function activeOrdersForMcp<T extends {
    orders: Order[];
}>(board: T): T;
/** Status/join: live roster only, and open/claimed orders without the brief (poll still returns it). */
export declare function boardSnapshotForMcp<T extends {
    orders: Order[];
}>(board: T): T;
/** team_join response body before workspaceRoot: omit board when includeBoard is false (heartbeat joins). */
export declare function joinPayloadForMcp(joined: unknown, board: {
    orders: Order[];
}, includeBoard?: boolean): Record<string, unknown>;
export declare function registerTeamTools(server: McpServer): void;
