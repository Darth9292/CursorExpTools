# Agent ids

Canonical names are **uppercase letters, then decimal numbers**. The bus stores and compares the canonical form.

## Naming

| Role | Canonical id | Sequence |
|---|---|---|
| Lead | `A` | Always A |
| First worker | `B` | Default in a new window |
| Next workers | `C` … `Z` | One letter at a time |
| After `Z` | `1`, `2`, `3`, … | Positive integers; `0` is invalid |

Joining **the next free worker** appends it to `team/config.json` `workers`. You cannot skip (with `A`+`B` present, join `C`, not `D`). `nextWorkerId` picks the first unused letter in `B`–`Z`, then the first unused `1`, `2`, …

## Aliases (still work)

These canonicalize to the same id:

- `a`, `A`, `lead-a`, `lead_A`, `agent-A` → **A**
- `b`, `B`, `worker-b`, `agent-B` → **B**
- Same pattern for any single letter: `worker-c` → **C**
- Numbers are already canonical: `1` stays **1** (there is no `worker-1` alias)

Invalid: empty string, two letters (`bb`), `0`, other punctuation.

Use the canonical letter in `/team-worker` and in `team_join` / `team_delegate` `to`. Aliases are accepted if you still have old `lead-a` / `b` muscle memory.

## Boot window C (third agent)

The human only duplicates a window and runs **one** slash command. Agents must **not** ask them to paste paths, loop prompts, or `workspaceRoot`.

1. Lead (`A`) keeps talking to the user in the original chat. Duplicate Workspace is the leftover human step when a new window is needed.
2. In the **new** window, run:

   `/team-worker C`

3. That chat joins as worker **C** (`role: "worker"`, `agentId: "C"`). If `C` is next, `team/config.json` gains `"C"` in `workers`.
4. The worker polls once, then starts **`hooks/start-watcher.mjs --agent C`** (optional `--root` from `team_poll`'s `workspaceRoot`; `notify_on_output` on `^AGENT_TEAM_WAKE`). Do **not** start `/loop 1m`. On idle, reply `idle` and leave the watcher running.

Default with no argument is **B** (`/team-worker`). Fourth window is `/team-worker D`, and so on through `Z`, then `/team-worker 1`.

## Boot window D (fourth agent)

Same leftover as C. Duplicate Workspace in a new window; if an **Allow** card appears, click **Allow always** (localhost / agent-team MCP). Then run:

`/team-worker D`

That chat joins as worker **D**. The worker polls once, then starts **`hooks/start-watcher.mjs --agent D`**. Do **not** `/loop 1m`. Do not print a copy-paste loop or ask the human for paths.

## Paths and MCP

- Omit `workspaceRoot` on team tools unless a call errors; then use this workspace’s `pwd` / `team/config.json` `workspaceRoot`. **Never ask the human to paste a file path.**
- If `team_*` tools are missing, prefer `node dist/cli.js join --agent <this window id>` then `poll` / `claim` / `report` (`B`, `C`, `D`, …). Streamable HTTP at `http://127.0.0.1:<port>/mcp` (`port` from `team/config.json`, default 7391) remains a fallback.

## What not to do

- Do not invent work without an open order.
- Do not tell the user to type in another window except the one-time Duplicate Workspace + `/team-worker C` (or `D`, …) boot.
- Do not skip ids. If next is `C` and you join as `D`, the bus rejects it.
