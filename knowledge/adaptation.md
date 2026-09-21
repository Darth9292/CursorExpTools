# Adapting the team to your project

Drop the plugin into a **PS3 reverse engineering** tree, a **DayZ modding** repo, or anything else: coordination stays the same; **roles change per project**.

## What stays the same (plugin)

- Lead **A** talks to you. Workers start at **B** and grow in order: **C**, **D**, … **Z**, then **1**, **2**, **3**…. Each `/team-worker <id>` for the next free id appends that worker. There is no fixed cap at C.
- `team_delegate`, file watcher wake, no timed `/loop`.
- `team/` board and MCP bus.

## What adapts (your repo)

| File | Purpose |
|------|---------|
| `knowledge/project.md` | Human-readable domain + specialist table for every joined worker |
| `team/project.json` | Machine profile; `team_delegate` injects context into orders |
| Your existing `.cursor/rules`, `AGENTS.md`, prompts | **Unchanged** — still authoritative for domain work |

## One-time in the lead chat

1. `/team-start` (or `/team-init` + join as lead)
2. **`/team-adapt`** — lead calls `team_adapt` (MCP), follows the skill, or runs:
   - `npm run team:adapt` — reads **`AGENTS.md`** only (no chat overrides).
   - `node dist/adapt-cli.js --agent A --workers-json overrides.json` — JSON `{ "domain", "summary", "workers": { "B": { "title", "focus" } } }` for chat overrides.
   - **Default:** personas from repo **`AGENTS.md`** (sample: [examples/AGENTS.sample.md](examples/AGENTS.sample.md)).
   - **Override:** anything you describe in chat is passed as `workers` on `team_adapt` and **beats** AGENTS.md for those ids.
3. If `team_adapt` is missing, restart the bus on port **7391** then Reload Window ([mcp-tools.md](mcp-tools.md)).
4. Duplicate Workspace → `/team-worker` in each worker window

Re-run **`/team-adapt`** when the project focus shifts (new mod, new console target, etc.). A worker who joins after the last adapt still gets a persona: their `AGENTS.md` section if it exists, otherwise a generic specialist. That does not remove personas already on the roster.

## Examples

- **PS3 RE:** B = MIPS/static analysis, C = tooling/scripts, D = docs + test harness
- **DayZ:** B = Enfusion gameplay, C = assets/PBO, D = server config + balancing

Workers see `persona` on `team_poll` and full context on each delegated order.
