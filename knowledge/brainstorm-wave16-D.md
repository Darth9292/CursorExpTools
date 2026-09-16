# Wave 16 brainstorm — ops (worker D)

## Verdict

Ops wins if we make **bus + dist freshness** and **dogfood hygiene** one-command obvious so agents stop guessing after `tsc` or Reload Window.

## Top 5 ideas (ops)

1. **SMOKE as release gate** — Treat `test/SMOKE.md` + `npm run pack:check` as the pre-tag checklist; add a single `npm run smoke:check` that runs build, pack:check, and vitest (no Duplicate Workspace automation).
2. **Bus restart** — `npm run team:bus-restart`: stop listener on `team/config.json` port (default 7391), then `npm run ensure:bus`; print `distStale` / `buildId` from health so lead knows the listener matches `dist/`.
3. **link-local discipline** — sessionStart + README: after `dist/` changes, `npm run link-local` from plugin repo; SMOKE checkbox already exists — add “run link-local if MCP tools missing `team_adapt`”.
4. **Marketplace hygiene** — Keep live `team/*` out of tarball; committed `dist/`; `knowledge/marketplace.md` checklist before public git push (parked until repo is public).
5. **Dogfood hygiene** — Trim config workers to B/C/D for daily dogfood; cap board via harvest; `team/watchers/<id>.pid` + `start-watcher.mjs` as the only idle path; never commit `team/orders.json` / results.

## Bus-restart one-command proposal

```json
"team:bus-restart": "node scripts/bus-restart.mjs"
```

`scripts/bus-restart.mjs` (sketch):

- Read port from `team/config.json` (or 7391).
- On Windows: `netstat` / `Get-NetTCPConnection` or try `taskkill` on PID owning the port; on Unix: `lsof` + `kill`.
- Run `node dist/ensure-daemon.js --port <port>`; exit non-zero if health not ok.
- Log: `started`, `buildId`, `distStale` from `/health`.

Document in README Dev, `knowledge/mcp-tools.md`, and one line in `test/SMOKE.md` Bus section.

## One shippable next slice (pick)

**Ship P0 #1: `npm run team:bus-restart` + `scripts/bus-restart.mjs` + docs** — small, testable (mock port kill optional), directly addresses the most common dogfood failure mode (stale listener after `dist` changes) and pairs with wave 16 `distStale` / sessionStart warnings already landed.
