# Bus restart (without breaking MCP forever)

The team bus is a **localhost** Node process (`dist/daemon.js`). It does **not** reload `dist/` while the same PID keeps listening.

## `ensure:bus` only

Use when:

- First boot of the day, or Cursor was closed and nothing is on the port.
- `/health` already shows the **current** `buildId` and `distStale` is false.

```bash
npm run ensure:bus
```

If `started: false` and the JSON includes a **hint** about reusing a live listener, the old process is still running — `ensure:bus` will **not** load new `dist/`. You need a full restart (below).

## `team:bus-restart` (kill + ensure)

Use when:

- You ran `npm run build` / `tsc` and MCP is missing new tools (`team_adapt`, etc.).
- `/health` reports **`distStale: true`** or `buildId` does not match what you expect.
- sessionStart warns that the bus build is stale.

```bash
npm run team:bus-restart
```

This kills whatever owns the configured port (`team/config.json`, default **7391**), then runs `ensure:bus`. Confirm `http://127.0.0.1:7391/health` → `"ok": true`.

## Avoid restarting during active work

Restarting drops **all** in-flight MCP HTTP sessions. Prefer:

1. Lead **`team_harvest`** and wait until workers have no **open/claimed** orders (or only doc-only slices you are OK interrupting).
2. Tell workers to pause; finish or `team_report` blocked orders first.
3. Run `team:bus-restart` from the **plugin repo root** (where `team/config.json` lives).
4. Workers’ **`watch-orders` / `start-watcher` processes keep running** — they only watch `team/orders.json`. MCP reconnect is separate (next section).

Open orders on the board are **not** deleted by a bus restart; only MCP connections break.

## MCP checklist after restart

Killing the listener causes Cursor to show **`Not connected`**, **`ECONNREFUSED`**, or **maximum reconnection attempts** even when `/health` is fine.

In **each** chat (lead **A** and every worker window):

1. `GET http://127.0.0.1:7391/health` → `"ok": true`.
2. **Settings → MCP** → **agent-team** → Reconnect, or **off** then **on**.
3. **Allow always** if prompted for `127.0.0.1:7391` ([approvals.md](approvals.md)).
4. Workers: re-run **`/team-worker`** if you rely on MCP (optional if you only use `node dist/cli.js` until green).

While MCP is red, CLI still works: `node dist/cli.js join --agent <id>` then `poll` / `claim` / `report`.

## Related

- Tool catalog and reconnect summary: [mcp-tools.md](mcp-tools.md)
- Allow cards and post-restart MCP toggle: [approvals.md](approvals.md#after-npm-run-teambus-restart)
- SMOKE bus checks: [test/SMOKE.md](../test/SMOKE.md)
