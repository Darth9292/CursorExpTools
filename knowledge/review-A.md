# Review A (architecture / integration)

**Quad review wave 20** — 2026-09-15 (lead)

## Verdict

Ready with gaps (marketplace blocked on **public Git**, not on code quality)

## Score

8

## Strengths

- **Coordination model** is coherent: file-backed `team/` board, role-gated MCP on `127.0.0.1:7391`, claims + delegate/report, lead harvest — matches the “human talks to lead only” product story.
- **Idle economics** fixed: workers wake via `watch-orders.mjs` + `AGENT_TEAM_WAKE`; anti-loop tests guard skills/commands; no pasteable `workerLoop` in `team:start`.
- **Ops maturity** since wave 16–19: `buildId` / `distStale` on health, `team:bus-restart`, `boardSnapshotForMcp` (open + claimed only), `team_suggest_worker` + `npm run team:suggest`, claim path normalization, inbox 16k cap.
- **Release gate green** in this workspace: `npm run smoke:check` (build + pack:check + **86** tests) passes; pack tarball excludes live `team/orders.json` (see `test/pack.test.ts`).
- **Plugin manifest** complete: `.cursor-plugin/plugin.json`, MIT `LICENSE`, `assets/logo.svg`, hooks/skills/commands wired; `dist/` shipped for hook spawn path.

## Risks

- **High:** No `.git` in this dogfood folder — Cursor marketplace requires a **public clone URL** ([marketplace.md](marketplace.md)). Cannot submit until init + push.
- **Med:** Post–`dist/` change, live bus + IDE MCP sessions can be **stale** until `team:bus-restart` and per-window MCP reconnect ([approvals.md](approvals.md)); reviewers who skip that may think tools are broken.
- **Med:** `review-A` (prior) still mentioned worker `/loop` wake — **obsolete**; wake is watcher-only (docs now aligned).
- **Low:** Optional product gaps: root `AGENTS.md` for adapt dogfood; `team:suggest` documented in top-level README (listed in `knowledge/README.md` / mcp-tools only).
- **Low:** Stale agent rows (E/F/G) and orphan B claims on `suggest-worker-cli` paths — coordination noise, not ship blockers.

## Next

1. **Public repo** — `git init`, commit tree (include built `dist/`), push to GitHub/GitLab, verify clone + `npm run smoke:check` on a clean machine.
2. **Human SMOKE** — Duplicate Workspace, `link-local`, MCP green, one delegate/harvest cycle per [test/SMOKE.md](../test/SMOKE.md).
3. **Submit** — [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish) with public URL; optional wave-20 doc polish (`team:suggest` in README, root `AGENTS.md`) before or after first review.
4. After submit: stop dogfood-only churn; treat marketplace feedback as the next backlog source.
