---
name: team-adapt
description: Specialize the agent team for this repo — PS3 RE, DayZ modding, etc. Use when starting a team in a new project or when the user wants workers to match existing rules and prompts.
disable-model-invocation: true
---

# Adapt the team to this project

You are the **lead**. Workers stay generic in the plugin; **this repo** defines who B, C, D are.

## Priority (strict)

1. **User chat in this conversation** — if they described roles (“B does MIPS, C scripts tools”), those **override** everything else for that worker id.
2. **`AGENTS.md`** (repo root) — auto-parsed for domain, summary, and B/C/D sections (`## Agent B`, `### C`, `- D: title — focus`, `**Title:**` / `**Focus:**` bullets).
3. **Fallback** — README / `.cursor/rules` for domain/summary only; generic specialist defaults for any worker still missing.

Do not replace or delete the user's `AGENTS.md`. You only mirror roles into `team/project.json` + `knowledge/project.md`.

## Layering (do not fight the user)

- **Keep** all existing `.cursor/rules`, `AGENTS.md`, skills, and user system prompts. They remain authoritative for domain work.
- **Add** only coordination: lead talks to the human, workers execute orders, `knowledge/` for durable facts.

## Steps

1. Collect **chat overrides** from this thread (if any). Map them to worker ids from `team/config.json`.
2. Call MCP **`team_adapt`** with `agentId` **A** (or your lead id):
   - `workers`: `{ "B": { "title", "focus" }, ... }` only for ids the user specified in chat
   - optional `domain` / `summary` if the user stated them explicitly in chat (also overrides file)
   - Omit `workspaceRoot` when possible.
3. If `team_adapt` MCP is missing (stale bus): `npm run team:adapt` for AGENTS.md-only, or `node dist/adapt-cli.js --agent A --workers-json <file>` with chat overrides in JSON. Otherwise read `AGENTS.md`, merge overrides, write `team/project.json` and `knowledge/project.md` manually.
4. `team_read_project` to verify. Tell the user one line what was used: `AGENTS.md`, `chat overrides`, or both.

## Delegating after adapt

`team_delegate` appends project context and each worker's persona. Orders stay concrete tasks.
