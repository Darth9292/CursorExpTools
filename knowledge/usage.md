# Prompt cost (do not /loop idle)

Cursor bills **each agent turn**, including idle timed-automation ticks with nothing to do.

Three workers polling every minute ≈ **180 idle prompts/hour**.

**Default:** `/team-worker` joins with `includeBoard: false`, then `team_poll`, then starts `hooks/watch-orders.mjs`. That is a Node `fs.watch` on `team/`. It prints `AGENT_TEAM_WAKE` only when that worker gets a **new open** order. The model runs then, not every minute. A second `hooks/start-watcher.mjs` for the same agent exits 0 when `team/watchers/<id>.pid` is still alive.

**Lead:** do not `/loop 2m`. Start `hooks/start-watcher.mjs --agent A --reports` once in the lead chat. It prints `AGENT_TEAM_WAKE` when a worker marks an order done or blocked, one model turn per new report, not a timer. Harvest on that wake, and also when the user says continue.

**Legacy timed loops:** in that worker chat cancel any running loop automation, then `/team-worker` again so it arms the watcher instead.

**Reload Window:** kills the watcher process; `team/status.json` may still show the worker online. Re-run `/team-worker` in that chat before expecting new orders to wake it.

**Stale watcher hint:** `hooks/session-start.mjs` checks `team/watchers/<id>.pid` for each configured worker. If the file is missing or `process.kill(pid, 0)` fails, session start adds a one-line reminder to re-run `/team-worker` (same signal you would see after Reload Window).
