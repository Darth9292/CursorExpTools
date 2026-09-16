# Runtime review (B) — wave 20

**Date:** 2026-09-15  
**Scope:** `server/` (store, mcp-tools, suggest-worker, suggest-worker-cli, ensure-daemon, claim-paths, cli), `dist/` vs source, `knowledge/bus-restart.md`, `npm test`.

## Verdict

Ready with gaps

## Score

8 / 10

## Strengths

- **`npm test`:** 86 passed across 21 files (2026-09-15 run); coverage includes store caps, MCP board helpers (`joinPayloadForMcp` / `includeBoard`), `suggest-worker` + **`suggest-worker-cli`**, CLI poll/claim/report, watch-orders, pack payload, link-local, anti-loop guards.
- **`TeamStore`:** `RESULT_BODY_CAP` 240, `INBOX_KEEP_LINES` 100, `INBOX_MAX_BODY_CHARS` 16 384, `KEEP_DONE_ORDERS` 50; inbox rotation and report truncation are exercised in `test/store.test.ts`.
- **`mcp-tools.ts`:** `boardSnapshotForMcp` drops done orders; `compactBoardForMcp` strips done briefs; `team_join` uses `joinPayloadForMcp` for heartbeat `includeBoard: false`; `team_suggest_worker` ranks via `suggestWorkers` / `topWorkerSuggestion`.
- **Lead without MCP:** `npm run team:suggest` → `dist/suggest-worker-cli.js` (`--root`, `--claim`, `--hint`) mirrors suggest JSON shape; `dist/cli.js` still covers harvest/status/delegate and worker poll/claim/report/join.
- **`claim-paths.ts`:** Normalizes slashes, rejects absolutes and `..`; used by store and suggest scoring (`test/claim-paths.test.ts`).
- **Dist staleness story is documented and partially instrumented:** `ensure-daemon` returns reuse `hint` when a live listener is kept; current `dist/ensure-daemon.js` includes that hint (rebuild no longer the blocker it was in the prior review). `knowledge/bus-restart.md` + `npm run team:bus-restart` describe kill-then-ensure for stale MCP.

## Risks

- **Med:** **`team/claims.json` orphan paths** — `server/suggest-worker-cli.ts` and `test/suggest-worker-cli.test.ts` still show `owner: B`, `orderId: null` (extra `team_claim_paths` from ord-4caf26b2, never released). Confusing for lead/harvest; TTL will expire but board hygiene is messy.
- **Med:** A **live bus on 7391** still will not pick up new `dist/` until restart (`team:bus-restart` / kill + `ensure:bus`); easy to misread “build succeeded” as “MCP has new tools.”
- **Low:** `test/daemon.test.ts` remains thin (reuse path only); no spawn of `dist/daemon.js` on the production port.
- **Low:** `compactBoardForMcp` still leaves `brief` / `resultBody` on non-`done` statuses (e.g. `blocked`).

## Next

- Release or let TTL clear **orphan claims** on `suggest-worker-cli` paths; prefer tying `team_claim_paths` to the order id or `team_release_paths` on report.
- Add **`dist/suggest-worker-cli.js`** to pack/smoke checklist if marketplace consumers expect `team:suggest` without a local `tsc`.
- One integration smoke: `npm run build && npm run team:suggest -- --claim server/mcp-tools.ts` against this repo’s `team/config.json`.
- Extend daemon/ensure tests for **`distStale: true`** JSON from `/health` without binding 7391 in CI.
- Document in README Limits that **`includeBoard: false`** is tested via `joinPayloadForMcp` (runtime contract is locked).
