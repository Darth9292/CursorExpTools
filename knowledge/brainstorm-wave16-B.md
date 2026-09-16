# Wave 16 brainstorm — worker B (runtime)

**Verdict:** The biggest runtime wins are shrinking MCP payloads, making stale bus/dist visible at join time, and coalescing watcher wakes so parallel delegate bursts cost one model turn per worker.

## Top 5 (runtime: MCP, store, bus, hooks, tests)

### 1. `team_join` heartbeat-only mode

Optional `includeBoard: false` skips embedding open/claimed orders on every join/reload; workers already use `team_poll` once. Cuts token noise when six windows re-join after Reload.

- **Effort:** S  
- **Dependency:** none (MCP schema + `compactBoardForMcp` already exist)

### 2. Harvest cursor in `team/status.json`

Persist `lastHarvestAt` / harvested order ids per lead so `team_harvest` never re-ships done `resultBody` snippets the lead already saw (complements board compaction).

- **Effort:** M  
- **Dependency:** `TeamStore.harvest` + one field in status file

### 3. Watcher wake coalesce (burst delegate)

When the lead delegates N orders to the same worker in one save, `watch-orders.mjs` should emit one `AGENT_TEAM_WAKE` with all new ids (partially there) and debounce fs events ~300ms longer for multi-write bursts.

- **Effort:** S  
- **Dependency:** none (`hooks/watch-orders.mjs`, `test/watch-orders.test.ts`)

### 4. `team:bus-restart` + `distStale` in `team_join` / `team_poll`

Call localhost `/health` from MCP tools (or shared helper) and attach `bus: { buildId, distStale }` to poll/join so workers know to tell the human to restart 7391 before debugging “missing tool”.

- **Effort:** M  
- **Dependency:** `ensure-daemon` health shape (already has `buildId` / `distStale`)

### 5. `team_suggest_worker` (read-only MCP)

Given `claim` path prefixes, score `team/project.json` worker `focus` strings and return ranked ids — no auto-delegate, just shrinks lead mistakes routing docs to B.

- **Effort:** M  
- **Dependency:** `team/project.json` populated (`team_adapt`)

## Implement next (my pick): #3 — watcher wake coalesce

**Touch list (3 files):**

1. `hooks/watch-orders.mjs` — extend debounce / batch `newOpenIds` per tick; log single wake line with sorted id list  
2. `test/watch-orders.test.ts` — simulate rapid double snapshot → one wake payload  
3. `knowledge/usage.md` — one line: parallel delegate = one wake per worker
