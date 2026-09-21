# Agent team board

This folder is the shared radio for Cursor IDE windows on this project.

- Talk only to the **lead** chat: prefer `/team-start` (or `/team-lead`).
- Extra windows run `/team-worker` (poll once, then `hooks/start-watcher.mjs`). Do not start a timed `/loop`.
- The lead starts `hooks/start-watcher.mjs --agent A --reports` so a finished order prints `AGENT_TEAM_WAKE` in that chat.
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

Live board is capped (50 done orders, 240-char `resultBody`, inbox 100 lines). `team_status` is the live roster plus open/claimed orders without briefs; workers `team_poll` for the brief. Done orders store an empty `brief`; full write-ups stay in `results/`. A second `hooks/start-watcher.mjs` for the same agent exits 0 while `watchers/<id>.pid` is alive. See [knowledge/bloat.md](../knowledge/bloat.md).

## Order modes

- `parallel` — worker does Y while lead continues X
- `assist` — worker investigates; lead stays owner of the user conversation
- `handoff` — worker becomes owner of that slice until done
