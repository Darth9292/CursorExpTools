# Agent team board

This folder is the shared radio for Cursor IDE windows on this project.

- Talk only to the **lead** chat: prefer `/team-start` (or `/team-lead`).
- Extra windows run `/team-worker` (poll once, then `hooks/start-watcher.mjs`). Do not start a timed `/loop`.
- Lead runs `/team-adapt` so B/C/D match this repo (`team/project.json`, `knowledge/project.md`).
- If a new Duplicate Workspace shows **Allow**, click **Allow always** (localhost / agent-team MCP).
- Durable facts go in `knowledge/`. Chatty coordination stays here.

## Files

- `config.json` — enable flag, bus port, lead/worker ids
- `status.json` — per-agent heartbeat
- `orders.json` — lead-issued work
- `inbox.jsonl` — questions, answers, findings
- `claims.json` — path leases (default 30 minutes)
- `results/<orderId>.md` — worker write-ups
- `harvest.json` — lead harvest cursors
- `project.json` — specialist personas (from `/team-adapt`)
- `watchers/<id>.pid` — orders watcher process ids (local only)

Live board is capped (50 done orders, 240-char `resultBody`, inbox 100 lines); full write-ups in `results/`. See [knowledge/bloat.md](../knowledge/bloat.md).

## Order modes

- `parallel` — worker does Y while lead continues X
- `assist` — worker investigates; lead stays owner of the user conversation
- `handoff` — worker becomes owner of that slice until done
