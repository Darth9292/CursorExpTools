---
name: team-restart-worker
description: Re-start the orders watcher after Reload Window or a dead PID
---

Follow **team-worker** boot, but focus on **watcher only**:

1. `team_join` as this window's worker id (`B`, `C`, …) with `includeBoard: false`.
2. If `team/watchers/<id>.pid` is still alive, do not start another watcher. A second `node hooks/start-watcher.mjs --agent <id>` exits 0 in that case.
3. If that pid file is missing or stale, start the watcher:
   - `node hooks/start-watcher.mjs --agent <id>` from the project root (or plugin `hooks/` path).
4. `team_poll` once. If an open order exists, claim and work; otherwise reply **idle** and leave the watcher running.

Never use Cursor `/loop`. MCP must be green (Settings → MCP → agent-team) after a bus restart — see [knowledge/approvals.md](../knowledge/approvals.md).
