# Knowledge

Durable facts for this project (symbols, structs, decisions).
The agent-team plugin does not interpret these files; they are a convention.

**Dogfood team:** lead **A**, workers **B / C / D** only (`team/config.json`). E–G are optional extras if you add them back to `workers`.

| Doc | What it covers |
|---|---|
| [ids.md](ids.md) | Agent ids: `A` lead, `B`–`Z` then `1`, `2`, …; `/team-worker C` boot; CLI join then poll |
| [approvals.md](approvals.md) | **Allow always** for localhost MCP; reconnect after bus restart |
| [bus-restart.md](bus-restart.md) | `team:bus-restart` vs `ensure:bus`, MCP toggle / full Cursor quit |
| [backlog.md](backlog.md) | Dogfood waves and parked work |
| [wave-16-synthesis.md](wave-16-synthesis.md) | B–G brainstorm merge + wave 17 queue |
| [usage.md](usage.md) | Workers use `watch-orders.mjs`, not timed `/loop` |
| [marketplace.md](marketplace.md) | Marketplace submit checklist (`pack:check`, public git) |
| [adaptation.md](adaptation.md) | `/team-adapt`, AGENTS.md, chat overrides, `npm run team:adapt` |
| [mcp-tools.md](mcp-tools.md) | MCP catalog, `team_suggest_worker` + `npm run team:suggest`, `includeBoard` on join |
| [security-localhost.md](security-localhost.md) | Localhost trust model for the bus |
| [bloat.md](bloat.md) | Disk caps on `team/` board and inbox |
| [order-templates/](order-templates/) | Delegate brief skeletons for the lead |
| [examples/AGENTS.sample.md](examples/AGENTS.sample.md) | Example `AGENTS.md` for auto-parse |
| [examples/project-dayz.json](examples/project-dayz.json) | Sample `team/project.json` — DayZ |
| [examples/project-ps3-re.json](examples/project-ps3-re.json) | Sample `team/project.json` — PS3 RE |

Worker-facing docs must not prescribe timed `/loop`; `test/anti-loop.test.ts` enforces that in skills/commands.

Stay tiny vs Cursor: `resultBody` 240 chars in `orders.json` (full text in `team/results/`), inbox 16k body / 100 lines, MCP status is open orders only — use `team_harvest` for done work.
