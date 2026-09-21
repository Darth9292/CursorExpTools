# Performance review synthesis

**Date:** 2026-09-21  
**Sources:** [perf-review-A.md](perf-review-A.md) (7/10), [perf-review-B.md](perf-review-B.md) (6/10), [perf-review-C.md](perf-review-C.md) (6/10)

The watcher and the 50-order cap are the right shape. Cost is tokens and extra file rewrites on the wake path.

## Agreed, in flight

- Status agents = lead + `config.workers` only.
- Status orders omit `brief` (workers get it from `team_poll`).
- CLI `status` uses the same snapshot as MCP.
- Harvest returns id, to, title, status, resultBody, resultPath, updatedAt.
- Done orders persist with an empty brief.
- MCP tool JSON is compact.
- Workers stop calling `team_status` every turn; boot join uses `includeBoard: false`.

Orders: `ord-0fb73ceb` (B), `ord-345cda75` (C).

## Next, not in this slice

- Stop appending the layering paragraph inside `enrichDelegateBrief` — done. Persona and domain stay on the brief; the layering note stays in the rule and `knowledge/project.md`.
- `start-watcher.mjs` exits when that worker's pid file is still alive.
- Watcher ignores `status.json` events when `fs.watch` supplies a filename.
