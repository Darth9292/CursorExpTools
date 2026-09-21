---
name: team-start
description: One-shot lead start — scaffold, join as lead, seed work; user only duplicates a worker window
---

Follow the **team-start** skill. You are Agent A. Scaffold `team/` if needed, ensure the bus, join as lead, then start one `hooks/start-watcher.mjs --agent A --reports` (notify on `AGENT_TEAM_WAKE`, not a timed `/loop`). On a fresh board (`seedOrder`, no open orders), seed one parallel SMOKE order per entry in `config.workers` (`knowledge/smoke-<id>.md`). Then tell the user only: Duplicate Workspace; if the new window shows Allow, click **Allow always** (localhost / agent-team MCP — [knowledge/approvals.md](../knowledge/approvals.md)); then `/team-worker` in the copy (watcher, not a 1m `/loop`). Optional third: `/team-worker C`. Optional fourth: Duplicate Workspace, Allow always, `/team-worker D`. Do not ask them to run `/team-init` or `/team-lead`.
