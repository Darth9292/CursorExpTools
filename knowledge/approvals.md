# First-window approvals

A **new Duplicate Workspace** (worker B, C, D, …) often shows a Cursor **approval card** on the first MCP, shell, or network call. Until someone clicks it, the worker is frozen — including the orders watcher.

## What it looks like

A native card in that window (not a chat message). Typical copy: a blocked tool/MCP/network call, with **Allow** / **Allow always** / Deny.

Common first-window triggers:

- `http://127.0.0.1:<port>/mcp` (port from `team/config.json`, default **7391**)
- The **agent-team** MCP
- Localhost `127.0.0.1` in general
- Starting `hooks/watch-orders.mjs`

## What to click

In the **worker** window (the one that ran `/team-worker`):

1. Click **Allow** (one-shot) or **Allow always** (this workspace) for localhost `127.0.0.1` and the agent-team MCP.
2. Leave the card. Do not switch away hoping the agent continues — it cannot proceed while the card is open.

Talk to the lead (`A`) in the original chat. Do not type follow-ups in the worker except the one-time `/team-worker` boot.

## After `npm run team:bus-restart`

Reload Window **alone** may not fix MCP. The bus can be healthy (`/health` → `ok`) while Cursor still shows **fetch failed**, **Not connected**, or **Maximum reconnection attempts exceeded**.

In **each** window (lead + every Duplicate Workspace):

1. Open **Settings → MCP** (or the MCP panel).
2. Find **agent-team** → **Reconnect**, or turn it **off** then **on**.
3. If an **Allow** card appears for `127.0.0.1:7391`, choose **Allow always**.

Then re-run `/team-lead` or `/team-worker` in that window.

## Agents

- Do **not** ask the human to paste paths, `workspaceRoot`, loop prompts, or MCP URLs. Infer the workspace; use `pwd` / `team/config.json` if a tool errors.
- If `team_*` tools are missing, prefer `node dist/cli.js join --agent <this window id>` then `poll` / `claim` / `report`. HTTP `/mcp` remains a fallback.
- If a card is waiting, a one-line status is enough: the human must **Allow** in *this* window. Then start (or restart) `watch-orders.mjs` via `/team-worker` — **never** Cursor `/loop`.
