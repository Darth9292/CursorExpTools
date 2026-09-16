---
name: team-init
description: Scaffold team/ files and start the agent-team HTTP bus so multiple Cursor IDE windows can run a lead plus workers. Use when the user says team-init, set up agent team, enable multi-window agents, or first-time team setup.
---

# Initialize the agent team

Work in the **consuming project** (the repo the user wants agents to share), not only the plugin repo.

## Steps

1. Start or reuse the bus. From a shell, prefer the plugin ensure script:
   - `node "%USERPROFILE%\.cursor\plugins\local\cursor-agent-team\dist\ensure-daemon.js"`
   - or `npx agent-team-bus` / `node dist/ensure-daemon.js` if this plugin repo is cwd
   - Windows PowerShell: `node "$env:USERPROFILE\.cursor\plugins\local\cursor-agent-team\dist\ensure-daemon.js"`
2. Confirm `GET http://127.0.0.1:7391/health` returns `"ok": true`.
3. Call MCP `team_scaffold` (omit `workspaceRoot`; never ask the human to paste a path).
   If MCP is still red, write the same files yourself using the schema in `team/README.md` after scaffold (config, empty status/orders/claims/harvest, inbox.jsonl, knowledge/README.md).
4. Tell the user the boot sequence (do not skip). Prefer **`/team-start`** in the lead chat over manual `/team-lead` steps.

```
1. Enable the agent-team MCP in Customize if it is red (bus must be healthy first).
2. In this chat (lead): /team-start
3. Command Palette: Workspaces: Duplicate Workspace in New Window
4. If the new window shows Allow, click Allow always (localhost / agent-team MCP). Details: knowledge/approvals.md
5. In that window: /team-worker  (agent B; poll once, then watch-orders.mjs — not a 1m /loop)
6. Optional: Duplicate Workspace again, /team-worker C
7. Optional fourth: Duplicate Workspace, Allow always, /team-worker D
```

Allow-card details: [knowledge/approvals.md](../../knowledge/approvals.md). Do not paste a `/loop` prompt for the human.

5. Do not become the worker in this chat unless the user asked for `/team-worker`.
