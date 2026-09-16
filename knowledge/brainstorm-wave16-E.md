# Wave 16 brainstorm — quality (worker E)

## Verdict

Wave 16 already shrank live MCP boards and added `distStale` signals; the next QA win is **automating the dogfood gate** (build + vitest + pack) and **locking compaction/anti-loop invariants** so regressions fail in CI, not in six Cursor windows.

## Top 5 ideas (testing, SMOKE, CI, regression, anti-loop)

### 1. `npm run smoke:check` (scripted SMOKE subset)

Wrap `npm run build`, `npm run pack:check`, and `vitest run` in one exit-code gate; document as the pre-wave / pre-tag step before manual Duplicate Workspace checks in `test/SMOKE.md`.
Does not replace human two-window smoke; it catches broken dist, tarball layout, and unit regressions in one command.

**Effort:** S

### 2. Board compaction regression (`open` + `claimed` only)

Add vitest fixtures asserting `compactBoardForMcp` / `team_status` payloads never embed `status: "done"` orders (wave 16 contract).
Prevents accidental “archive board in every poll” token bloat and documents that `team_harvest` owns history.

**Effort:** S

### 3. Watcher output contract test

Extend `test/watch-orders.test.ts` to assert wake lines match `^AGENT_TEAM_WAKE` with stable shape (agent id, order ids) so Cursor `notify_on_output` hooks do not silently break.
Pairs with runtime coalesce work (B) without duplicating debounce implementation tests.

**Effort:** S

### 4. GitHub Actions: `npm test` on push/PR

Minimal workflow: checkout, `npm ci`, `npm run build`, `npm test` (no bus, no MCP). Cheap safety net for plugin repo and future marketplace consumers.
Optional matrix later for Windows vs Linux path quirks in `start-watcher.mjs`.

**Effort:** M

### 5. Anti-loop guard expansion

Add `hooks/start-watcher.mjs` and linked `team-worker` skill paths under `WORKER_FACING`; ban phrases like “poll every minute” or pasteable loop prompts in `team:start` JSON exports.
Keeps billed idle loops from creeping back via copy-paste or hook comments after refactors.

**Effort:** S

## One shippable next slice (pick)

**Ship #2 — board compaction regression tests** plus a one-line note in `knowledge/bloat.md` / README Limits: “status board is operational, not archive.” Small diff, no daemon, directly guards wave 16 P0 behavior; `smoke:check` and CI (#1/#4) can follow in the same wave as separate orders.
