# MCP tools (agent-team)

Bus: `http://127.0.0.1:7391/mcp` (default). After `dist/` changes: **`npm run team:bus-restart`** (or kill port 7391 + `npm run ensure:bus`) so new tools load (`team_adapt`, etc.).

### After `team:bus-restart` (important)

Killing the listener drops **all** Streamable HTTP MCP sessions. Cursor often logs `ECONNREFUSED`, `Maximum reconnection attempts exceeded`, and `Not connected` on `team_join` even after `/health` is OK again.

1. Confirm the bus: `http://127.0.0.1:7391/health` → `"ok": true`.
2. **Reload Window** in each Cursor chat that uses agent-team (lead + workers), **or** toggle **agent-team** off/on under MCP settings.
3. Re-run `/team-worker` in worker windows (watcher is separate from MCP).

CLI fallback while MCP is red: `node dist/cli.js join --agent A` / `harvest --agent A` / `poll --agent B`.

| Tool | Role | Purpose |
|------|------|---------|
| `team_join` | both | Register lead/worker; set `includeBoard: false` on routine heartbeats so the response omits the board (default `true` includes open/claimed snapshot) |
| `team_whoami` | both | Current join record |
| `team_status` | both | Agents + **open/claimed orders only** (use `team_harvest` for done) |
| `team_read_project` | both | `team/project.json` + layering note |
| `team_adapt` | lead | Build profile from **AGENTS.md** + optional `workers` overrides (chat wins) |
| `team_suggest_worker` | lead | Rank workers from `claim` paths + hint (read-only). CLI: `npm run team:suggest -- --claim <paths…>` [`--hint`] [`--root`] |
| `team_delegate` | lead | Issue order (brief auto-enriched with project persona) |
| `team_harvest` | lead | New worker results since last harvest |
| `team_cancel` / `team_nudge` | lead | Cancel or ping a worker |
| `team_poll` | worker | Open orders + `persona` + `workspaceRoot` |
| `team_claim_order` / `team_report` / `team_ask_lead` | worker | Claim, finish, ask lead |
| `team_inbox_*` / `team_claim_paths` / `team_release_paths` | both | Inbox (body max **16 384** chars per message; file keeps last **100** lines — [bloat.md](bloat.md)) and path leases |
| `team_start` | lead | One-shot scaffold + join + optional seed |
| `team_scaffold` | — | Create `team/` without join |

CLI fallback when the catalog is stale: `node dist/cli.js` (harvest, join, poll, claim, report). Adapt without MCP: `npm run team:adapt` or overrides file — [adaptation.md](adaptation.md).
