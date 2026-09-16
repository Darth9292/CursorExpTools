# Multi-window smoke checklist

Use after `npm run build` (and `npm run link-local` if you want Customize to load the plugin from `~/.cursor/plugins/local/cursor-agent-team`).

## Build + pack

- [ ] `npm run build`
- [ ] `npm run pack:check` (`npm pack --dry-run`; tarball must include `dist/` and `hooks/watch-orders.mjs`, not live `team/orders.json`)

## Bus

See [knowledge/bus-restart.md](../knowledge/bus-restart.md) for when to use `ensure:bus` vs `team:bus-restart`, timing vs active orders, and the post-restart MCP checklist.

- [ ] `team/config.json` lists lead **`A`** and workers **`B`**, **`C`**, **`D`** only (dogfood roster; not B–G unless you intentionally expanded it).
- [ ] `npm run ensure:bus` prints `"ok": true` (second run sets `"started": false`).
- [ ] `GET http://127.0.0.1:7391/health` returns `"ok": true`.
- [ ] A second `npm run start:bus` does not crash the first listener (EADDRINUSE exits 0 or ensure reuses health).
- [ ] After `dist/` changes, run `npm run team:bus-restart` from this repo (kill port **7391** + `ensure:bus`); confirm `/health` → `"ok": true` and `buildId` / `distStale` look current (a live listener will not load new `dist` without restart).
- [ ] Prefer **`team:bus-restart`** when `/health` shows **`distStale: true`** or MCP is missing new tools; prefer **`ensure:bus`** only when nothing is stale and the listener is already current.

## Plugin load

- [ ] `npm run link-local` from this plugin repo (not System32). Reload Window; `agent-team` MCP is green in Customize.
- [ ] After `dist/` changes, re-run `npm run link-local` from this repo (the local plugin copy is otherwise stale).
- [ ] Reload Cursor. Customize shows `cursor-agent-team` (rules, skills, commands, hooks, MCP).
- [ ] Open a folder **without** `team/config.json`. Agent does not act as lead/worker.
- [ ] In a throwaway project, `/team-init` creates `team/` + `knowledge/`.
- [ ] `npm run team:start` (this repo) writes `team/`, joins `A`, seeds an order, bus healthy.

## Two windows (Duplicate Workspace)

- [ ] Command Palette: `Workspaces: Duplicate Workspace in New Window`.
- [ ] New windows often pause on a Cursor **Allow** card (MCP or localhost); click **Allow always** once. See [knowledge/approvals.md](../knowledge/approvals.md).
- [ ] Window A: `/team-start` (or `/team-lead`) → join as `A`.
- [ ] Window B: `/team-worker` → join as `B`, poll once, start `watch-orders.mjs` with `--root <workspace>` (not `/loop 1m`).
- [ ] Window B has **no** timed `/loop` automation running (no billed idle turns every minute).
- [ ] B's terminal shows `watching …/team/orders.json`; new orders print `AGENT_TEAM_WAKE` and trigger **one** model turn (watcher only, not `/loop`).
- [ ] Optional window C: Duplicate Workspace again, `/team-worker C`.
- [ ] Optional window D: Duplicate Workspace again, `/team-worker D`.
- [ ] In A: ask the lead to have B write a dummy `knowledge/smoke.md` in parallel.
- [ ] `team/orders.json` gets an `open` then `claimed`/`done` order.
- [ ] `team/results/<id>.md` exists.
- [ ] A's next turn `team_harvest` sees that result.
- [ ] After harvest, if workers are idle the lead dispatches the next slice (do not wait).
- [ ] Two agents do not write the same claimed path.
- [ ] Idle workers do not fire a model turn every minute (watcher process only).

## MCP red in Customize

After **`npm run team:bus-restart`**, `/health` can be fine while every chat still shows MCP disconnected — follow [knowledge/bus-restart.md](../knowledge/bus-restart.md#mcp-checklist-after-restart).

- [ ] Start the bus, then toggle the `agent-team` MCP server on.
- [ ] **MCP toggle only** (Settings → MCP → agent-team off/on, or Reconnect): enough after bus restart when `/health` is OK; use **Allow always** if prompted ([approvals.md](../knowledge/approvals.md)).
- [ ] **Full Cursor quit** (all windows): use when MCP stays red after toggle, plugin rules/skills look stale, or you changed `link-local` / plugin files — reopen workspace, confirm bus, then reconnect MCP in each lead/worker window.
- [ ] If `agent-team` is missing from the tool catalog, prefer `node dist/cli.js` (`harvest --agent A`, `join --agent <id>` then `poll --agent B` / `--agent C` / `--agent D`, then `claim` / `report`). HTTP `http://127.0.0.1:7391/mcp` remains a fallback.
