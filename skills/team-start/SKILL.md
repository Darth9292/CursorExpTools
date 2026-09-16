---
name: team-start
description: One-shot start of the agent team as lead. Use when the user says start the team, easy start, initiate the team, dogfood this plugin, or wants Agent A to boot workers. Prefer this over /team-init plus /team-lead.
---

# Start the team (you are the lead)

Do this yourself. Do not ask the user to run five commands.

## Automated (you)

1. If `dist/start.js` exists in this plugin repo, run:
   `npm run team:start`
   From another project: `node <plugin>/dist/start.js --root <absolute workspace> --seed-order`
2. If the `team_start` MCP tool is available, call it (`seedOrder: true`). Omit `workspaceRoot` unless the tool errors. Never ask the human to paste a path.
   On a **fresh board** (no open or claimed orders), seeding creates the dogfood order for `workers[0]` plus a tiny parallel SMOKE order per other configured worker (`knowledge/smoke-<id>.md`).
3. Read the JSON result. You are agent **A**. Harvest/status on later turns.
4. **Consumer repos** (any project that is not this plugin checkout): before the human duplicates workspaces, run **`/team-adapt`** once so `knowledge/project.md` and `team/project.json` define B/C/D specialists. Skip if those files already match the user's stated focus.

## Still requires the human (you cannot Duplicate Workspace)

Tell them only this:

1. Command Palette: **Workspaces: Duplicate Workspace in New Window**
2. If the new window shows **Allow**, click **Allow always** (localhost / agent-team MCP). Details: [knowledge/approvals.md](../../knowledge/approvals.md)
3. In that new window: `/team-worker` (agent B; poll once, then watch-orders.mjs — not a 1m `/loop`).
4. Optional third agent: Duplicate Workspace again, `/team-worker C`.
5. Optional fourth: Duplicate Workspace, **Allow always**, `/team-worker D`.
6. After **Developer: Reload Window** in a worker chat, run `/team-worker` again in that window — the orders watcher is not persisted across reload.

Keep talking to them in **this** chat. Do not send them to window B for conversation.

If the bus is down and `npm run team:start` is unavailable, `/team-bus-start` then `team_start`.
