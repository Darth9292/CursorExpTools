---
name: team-worker
description: Make this chat a worker that only executes lead orders
---

Follow the **team-worker** skill. Join as worker (id from the user: `B`, `C`, … `Z`, then `1`; default `B`). **Poll once on boot** (claim any open order before starting the watcher). If work exists, do it. Then start **one** `hooks/start-watcher.mjs --agent <id>` background process (add `--root <absolute workspace>` from join/poll when present; cwd may be wrong e.g. System32) with `notify_on_output` on `^AGENT_TEAM_WAKE`. **Never** use Cursor `/loop` in this window. If `team_*` tools are missing, prefer `node dist/cli.js join --agent <id>` then `poll` / `claim` / `report`.

**After Reload or `npm run team:bus-restart`:** MCP green → run `/team-worker <id>` again → check `team/watchers/<id>.pid` is fresh. See [knowledge/approvals.md](../knowledge/approvals.md) and [knowledge/bus-restart.md](../knowledge/bus-restart.md).

If this window is frozen on a Cursor **Allow** card, click **Allow always**, then start the watcher.
