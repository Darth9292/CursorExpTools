/** `dist/daemon.js` mtime — changes whenever `npm run build` updates the bus code. */
export declare function readDistBuildId(root?: string): number | null;
export declare function isDistStale(runningBuildId: unknown, root?: string): boolean;
