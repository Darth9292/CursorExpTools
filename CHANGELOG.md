# Changelog

## Unreleased

- **Efficiency:** `team_status` lists only the live roster and omits order briefs (workers use `team_poll`). Harvest returns a short result. Done orders store an empty brief. MCP JSON is compact. Delegate briefs no longer repeat the layering paragraph. A second `/team-worker` does not start another watcher if that pid is still alive.
- **Store:** an unchanged heartbeat does not rewrite `status.json`. `report()` writes `team/results/<id>.md` after releasing the board lock. Inbox append does not reread `inbox.jsonl` while the file is under 100 lines.
- **Wave 20 / publish prep:** README lead routing (`team_suggest_worker`, `npm run team:suggest`); root `AGENTS.md` for plugin dogfood; marketplace checklist cross-links.
- **Efficiency:** `team_status` and `team_join` return only open/claimed orders; use `team_harvest` for completed work.
- **Bus:** `/health` includes `buildId` and `startedAt`; `ensure:bus` reports `distStale` when `dist/` is newer than the running listener; sessionStart warns on stale bus.
- **DX:** `npm run team:adapt`; dogfood default workers B/C/D.
- **Wave 16.1:** `npm run team:bus-restart`, `npm run smoke:check`, claim path normalization, `knowledge/order-templates/`, lead wave-closeout skill, [knowledge/wave-16-synthesis.md](knowledge/wave-16-synthesis.md).
- **Wave 17:** `team_suggest_worker` MCP, CI workflow (`smoke:check`), `/team-restart-worker` command, MCP reconnect docs after bus restart.

(Release held — dogfooding more before tagging 1.1.0.)

- Workers no longer use a timed `/loop`. They watch `team/orders.json` via `hooks/watch-orders.mjs` (always pass `--root` from `workspaceRoot`; parent-walk for `team/config.json` when cwd is wrong) and take one model turn per new open order.
- After **Reload Window** in a worker chat, run `/team-worker` again — the watcher is not persisted.
- `/team-start` on a fresh board seeds a small smoke order for each worker in `config.workers` (not only B).
- Removed pasteable `workerLoop` / `leadLoop` from `team:start` JSON; worker idle is skill-only (`WORKER_WATCH_PROMPT` in code/tests). `test/anti-loop.test.ts` guards worker-facing docs.
- `npm run pack:check` dry-run guard for marketplace tarball (when we ship).
- **Project adaptation:** `/team-adapt`, `team_adapt` MCP, `team/project.json`, `knowledge/project.md`; personas default from **`AGENTS.md`**, **chat overrides win**; delegate briefs include domain + worker persona (`knowledge/adaptation.md`).
- **Docs:** [knowledge/mcp-tools.md](knowledge/mcp-tools.md), `npm run team:adapt` / `adapt-cli.js` when MCP catalog is stale; SMOKE and ids.md aligned with `start-watcher`.

## 1.0.0

- Local Cursor plugin: talk only to lead **A**; extra windows run workers **B**–**Z**, then **1**, **2**, …
- Shared `team/` board plus Streamable HTTP MCP at `http://127.0.0.1:7391/mcp`
- Easy start leftover: Duplicate Workspace, **Allow always**, `/team-worker` (orders watcher, not a timed loop)
