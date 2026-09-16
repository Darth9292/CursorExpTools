# Plugin backlog (dogfood)

Status: waves 1–15 shipped; **release held**. **Wave 16** — efficiency + stale-bus detection (see [wave-16-roadmap.md](wave-16-roadmap.md)).

## Wave 16 (completed)

- Brainstorms B–G; synthesis [wave-16-synthesis.md](wave-16-synthesis.md).
- `team:bus-restart`, `smoke:check`, claim path guards, order templates, lead wave closeout, [security-localhost.md](security-localhost.md).

## Wave 17 (completed)

- `team_suggest_worker`, CI `smoke:check`, `team-restart-worker`, `includeBoard`, inbox 16k cap, [bus-restart.md](bus-restart.md).
- Dogfood workers **B/C/D** (E/F/G disabled).

## Wave 18 (completed)

- `joinPayloadForMcp` + includeBoard tests; SMOKE bus/MCP; `knowledge/README.md` index (C wake miss → lead backfill).

## Wave 19 (completed)

- `team:suggest` CLI, worker wake docs (C), marketplace + `smoke:check` / `pack:check` (D).

## Wave 20 (completed — publish prep)

- README + [mcp-tools.md](mcp-tools.md): `team_suggest_worker` and `npm run team:suggest`.
- Root [AGENTS.md](../AGENTS.md) for adapt dogfood on this repo.
- [marketplace.md](marketplace.md) checklist step 6 updated; `git init` ready for first push.

## Parked

- MCP session TTL (F brainstorm).
- **Human:** public remote + push, full SMOKE, [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish).

## Wave 14–15 (completed)

- Project adaptation, mcp-tools docs, adapt-cli, anti-loop, multi-seed SMOKE.

## Wave 13 (completed)

- `workspaceRoot` on poll/join; `start-watcher.mjs`; stale watcher session hint.

## Wave 12 (completed, release deferred)

- `pack:check`, `test/pack.test.ts`, SMOKE pack step, CHANGELOG content in Unreleased.
- Marketplace checklist in `knowledge/marketplace.md`; `dist/` tracked.

## Wave 11 (completed)

- `test/anti-loop.test.ts`; removed pasteable `workerLoop` from `team:start` JSON.
- SMOKE anti-loop; README; `.gitignore` for live board.

---

## History

Waves 1–10: watcher vs `/loop`, `--root`, multi-seed, reload docs, disk caps, link-local, bus restart. See git history and [review-A.md](review-A.md).
