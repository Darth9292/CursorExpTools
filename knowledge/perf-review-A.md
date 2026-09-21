# Architecture performance review (A)

**Date:** 2026-09-21  
**Scope:** coordination cost — disk board, MCP/CLI payloads, delegate briefs, status heartbeats. Runtime I/O detail is worker B; prompt/skill cost is worker C.

## Verdict

Efficient enough for a 3-window team. The expensive part is **tokens on every lead turn**, not CPU. Disk locks and full-file JSON rewrites are fine at the current cap (50 done orders).

## Score

7 / 10

## Findings

1. **High — `team_status` still returns every joined agent, including people not in `config.workers`.** `getBoard` emits all of `status.json`. This board still lists D, E, F, and G on every status call. The lead protocol calls `team_status` every turn, so stale `lastResult` text is re-billed forever. **Change:** return only `leadId` plus `config.workers`, or drop agents whose `ts` is older than a TTL and who are not in the roster.

2. **High — CLI `status` returns the full order history.** `server/cli.ts` `status` is raw `getBoard()` (all non-cancelled orders, full briefs). A local status dump was ~55 KB / ~970 lines while MCP `boardSnapshotForMcp` already keeps only open and claimed orders. Workers who fall back to `node dist/cli.js status` pay that on every poll-adjacent check. **Change:** CLI `status` should use the same snapshot helper as MCP.

3. **Med — `team_harvest` returns the whole order, including the enriched brief.** Harvest is how the lead learns results, but the brief was already written by the lead. **Change:** harvest payload = id, to, title, status, resultBody, resultPath, updatedAt.

4. **Med — every `team_delegate` copies domain, persona, and the full layering paragraph into the order brief** (`enrichDelegateBrief`). That text is then stored in `orders.json`, returned by poll, and (today) returned again by harvest. **Change:** store the task brief only; attach a short persona line at poll time, or one line pointing at `knowledge/project.md`.

5. **Med — MCP tool results are pretty-printed** (`JSON.stringify(data, null, 2)` in `jsonResult`). Every status, harvest, and delegate response is larger than it needs to be. **Change:** compact JSON for tool results.

6. **Low — one global lock rewrites whole JSON files** (`withLock` + `writeJson` pretty-print) on delegate, claim, report, harvest cursor, and inbox append. At 50 orders this is milliseconds, not a bottleneck. Do not split the lock until a profile says otherwise. Inbox rotation already returns early when under 100 lines, but it still reads the file on every append.

7. **Low — watcher is already the right shape.** `hooks/watch-orders.mjs` uses `fs.watch` plus a 300 ms debounce and prints one `AGENT_TEAM_WAKE` line per new open id. No timed model loop.

## Next

- Prune status agents to the live roster and make CLI status match the MCP snapshot.
- Slim harvest and stop persisting the layering paragraph on every order.
- Compact MCP JSON after the payload cuts, so the win is visible in the next dogfood turn.
