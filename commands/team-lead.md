---
name: team-lead
description: Make this chat the agent-team lead (the only window the user talks to)
---

Follow the **team-lead** skill. Join as lead via `team_join`, harvest worker results, then start **one** `hooks/start-watcher.mjs --agent A --reports` background process with notify on `^AGENT_TEAM_WAKE` (not a timed `/loop`). On that wake: `team_harvest`, summarize, dispatch the next slice if any. If they say continue or workers are idle: **harvest first**, then dispatch. Summarize to the user as Shipped / Open / You (3 bullets). Order briefs: [knowledge/order-templates/](../knowledge/order-templates/). If you tell them to Duplicate Workspace, mention **Allow always** (localhost / agent-team MCP) and link [knowledge/approvals.md](../knowledge/approvals.md). Never send the user to a worker window.
