---
name: team-restart-worker
description: Re-start the orders watcher after Reload Window or a dead PID
---

Follow **team-worker** boot, but focus on **watcher only**:

1. `team_join` as this window's worker id (`B`, `C`, …).
2. If `team/watchers/<id>.pid` is missing or stale, start the watcher:
   - `node hooks/start-watcher.mjs --agent <id>` from the project root (or plugin `hooks/` path).
3. `team_poll` once. If an open order exists, claim and work; otherwise reply **idle** and leave the watcher running.

Never use Cursor `/loop`. MCP must be green (Settings → MCP → agent-team) after a bus restart — see [knowledge/approvals.md](../knowledge/approvals.md).
