# Runtime performance review (B)

**Date:** 2026-09-21  
**Scope:** disk I/O per MCP call, lock hold time, MCP payload size, watcher wake cost, stale-bus / rebuild cost. Read-only. Files: `server/store.ts`, `server/mcp-tools.ts`, `server/daemon.ts`, `server/ensure-daemon.ts`, `hooks/watch-orders.mjs`, `hooks/start-watcher.mjs`.

## Verdict

The single lock, done-order cap, and 300 ms file-watch debounce are the right shape for a three-window team. The waste is constant extra I/O: every poll rewrites `status.json` under that lock, every claim rewrites retained done-order briefs, and a rebuilt `dist/` never replaces the running bus.

## Score

6 / 10

## Findings

1. **High — `TeamStore.withLock` (`server/store.ts`) holds the global lock across several full-file rewrites.** `claimOrder` under the lock reads `status.json` (`requireRole`), reads and rewrites `orders.json` (`saveOrders`), reads and rewrites `claims.json` (`upsertClaims`), then reads and rewrites `status.json` again (`touchAgent`). `report` also `mkdir`s and writes `team/results/<id>.md` before `release()`. **Cost:** lead `delegate` and worker `claim` / `poll` serialize, and the critical section is multiple pretty-printed file writes, not one field update. **Change:** mutate in-memory copies and write the JSON files under the lock; write the result markdown outside the lock. Reuse the status object from `requireRole` instead of `touchAgent` calling `loadStatus` again.

2. **High — `saveOrders` rewrites hot history on every mutation.** It pretty-prints all of `orders.json`, including up to `KEEP_DONE_ORDERS` (50) done orders that still store the `enrichDelegateBrief` text. `boardSnapshotForMcp` drops done orders from MCP responses, but `getBoard` still parses them on every `team_status` and `team_join`. **Cost:** claim, report, and delegate writes, and status reads, grow with retained briefs rather than with open work. **Change:** when an order becomes done or cancelled, drop `brief` (keep id, title, status, `resultPath`, capped `resultBody`, timestamps), or move done orders to `team/orders-done.json` so `orders.json` holds only open and claimed work.

3. **Med — `team_poll` is a write.** `TeamStore.poll` reads `status.json` twice (`loadStatus`, then `requireRole`) and `orders.json` once. The MCP handler then calls `heartbeat`, which takes `withLock`, reads `status.json` twice more, and rewrites it. That rewrite fires `fs.watch` on `team/`. The tool result returns each order whole (enriched brief included) via pretty-printed `jsonResult`. **Cost:** a wake poll dirties the board, contends with the lead, and ships the brief the worker already has on the order. **Change:** update `doing` only when it changes, and read status once. On the poll payload, return id, title, the task brief, `claim`, and `doneWhen`; persona is already a separate field.

4. **Med — inbox rotation reads the whole log on every append.** `appendInboxUnlocked` appends one line, then `rotateInboxUnlocked` reads all of `inbox.jsonl` while still inside `withLock`. The early return (`lines.length <= INBOX_KEEP_LINES`) happens only after that read. **Cost:** one extra full read per inbox message on the global lock, including when the file is under 100 lines. **Change:** keep an in-memory line count after the first read and skip the read until the count passes `INBOX_KEEP_LINES`.

5. **Med — watcher wakes do more I/O than one new order, and a second boot double-wakes.** `watch-orders.mjs` watches the `team/` directory. A null `filename` (common with Windows `fs.watch`) still calls `onMaybeChange`, which re-reads and parses `orders.json` after 300 ms. Status and claims writes from finding 3 can therefore parse `orders.json` even when open ids did not change. `start-watcher.mjs` `main` always spawns; it does not check `team/watchers/<id>.pid`. A second `/team-worker` leaves two processes that can each print `AGENT_TEAM_WAKE`. **Cost:** extra parses on the hot path, and two billed model turns for one order. **Change:** watch `orders.json` only, or ignore events whose filename is set and is not `orders.json`. If the recorded pid is alive, print it and exit 0.

6. **Med — a stale bus is detect-only.** `ensureDaemon` (`server/ensure-daemon.ts`), when `/health` is ok, sets `distStale` from `isDistStale` and returns a kill hint. It does not recycle the process. `daemon.ts` captures `readDistBuildId()` once at startup (`dist/daemon.js` mtime). `hooks/session-start.mjs` `isBusDistStale` only appends a prompt line. **Cost:** after `npm run build`, every MCP call keeps running the previous `dist/` until the port is killed and the window is reloaded. **Change:** re-stat `dist/daemon.js` on a timer (or on `/health`) and exit 0 when mtime differs, after in-flight `/mcp` handlers finish, so the next session-start `spawnEnsure` starts the new process. Do not kill the listener from `ensureDaemon` mid-request.

7. **Low — pretty JSON on disk and on the wire.** `writeJson` and `jsonResult` use `JSON.stringify(..., null, 2)`. `compactBoardForMcp` does not shrink open or claimed briefs; `activeOrdersForMcp` already removed done orders, so the compact helper does not change the live status payload. **Cost:** about 2× bytes on store writes and on `team_status` / `team_poll` / `team_join` text. **Change:** compact JSON for store files and tool results. Omit `brief` from `team_status` orders; workers already receive it from `team_poll`.
