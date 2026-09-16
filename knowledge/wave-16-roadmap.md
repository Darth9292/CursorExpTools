# Wave 16 — intelligence, efficiency, power

Lead synthesis (2026-09-15). Specialist brainstorms: `knowledge/brainstorm-wave16-{B,C,D,E,F,G}.md`.

## Shipped in this wave (lead)

| Theme | Change |
|--------|--------|
| **Efficiency** | `team_status` / `team_join` board = **open + claimed only**; use `team_harvest` for done work |
| **Efficiency** | Dogfood `team/config.json` workers trimmed to **B, C, D** |
| **Power** | `/health` exposes `buildId`, `startedAt`, `version`; `ensure:bus` sets **`distStale`** when `dist/` is newer than the listener |
| **Ops** | `sessionStart` warns when bus `buildId` ≠ local `dist/daemon.js` |
| **DX** | `npm run team:adapt` script |

## Next (prioritized)

### P0 — reliability

1. **One-command bus refresh** — `npm run team:bus-restart` (kill 7391 + ensure) documented in README/mcp-tools.
2. **Auto `link-local` hint** when `team_adapt` missing from MCP catalog (sessionStart already hints stale dist).

### P1 — smarter coordination

3. **Delegate routing helper** — `team_suggest_worker` or lead skill table: path prefixes → B/C/D (server vs docs vs ops) from `team/project.json` focus strings.
4. **Order templates** — `knowledge/order-templates/` + lead copies brief skeletons (review, doc-only, test-only) to cut prompt variance.
5. **Blocked / ask-lead inbox** — lead `team_inbox_read` filtered `type=question`; surface in `team_status` when any worker blocked.

### P1 — efficiency

6. **Harvest cursor** — persist `lastHarvestAt` per lead in `team/status.json` so harvest never re-sends old done bodies (if not already).
7. **Compact `team_join`** — optional `includeBoard: false` for heartbeat-only joins.
8. **Watcher coalesce** — debounce `AGENT_TEAM_WAKE` when lead delegates N parallel orders (one wake per worker per burst).

### P2 — intelligence

9. **`/team-adapt` on stale profile** — sessionStart if `config.workers` has ids missing from `team/project.json`.
10. **Findings index** — `team_publish_finding` writes to `knowledge/findings/` with tags; lead harvest includes new finding paths.
11. **Consumer AGENTS.md** — ship root `AGENTS.md` in plugin repo (from `knowledge/examples/AGENTS.sample.md`) for dogfood parse tests.

### P2 — power

12. **SDK / CI agent** — document `cursor-sdk` running `team:start` + poll in headless smoke (see Cursor SDK skill).
13. **Cross-repo bus** — multiple `workspaceRoot` on one daemon (already partial via store map); document multi-project limits.
14. **Marketplace** — still parked; see [marketplace.md](marketplace.md).

## Principles

- **No worker `/loop`** — file watcher + harvest on user continue.
- **Layering** — team coordinates windows; project rules stay authoritative.
- **Token budget** — status is operational snapshot, not archive.
