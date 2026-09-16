# PLUGIN UX review — wave 20

**Date:** 2026-09-15  
**Scope:** `skills/`, `commands/`, `agents/`, `hooks/`, `rules/`, `mcp.json`, `.cursor-plugin/`, `README.md` vs [marketplace.md](marketplace.md)

*(Lead backfill — worker C did not claim ord-d71789d7; prior review-C incorrectly described a 1m `/loop` idle path.)*

## Verdict

Ready with gaps

## Score

8 / 10

## Strengths

- **Human leftover** is tight and consistent: Duplicate Workspace → **Allow always** → `/team-worker` (poll once, then `watch-orders.mjs`). Documented in README, `skills/team-worker`, `commands/team-worker.md`, `knowledge/approvals.md`, and rule 11.
- **Anti-loop** is real, not cosmetic: `test/anti-loop.test.ts` scans worker-facing skills/commands; README and `team:start` output do not paste `workerLoop`; wave 19 added reload/bus-restart wake playbook in `team-worker`.
- **Lead flow** is documented: `/team-start`, harvest on **continue**, optional `/loop 1h` for lead only (explicit cost warning), wave closeout in `team-lead` skill.
- **Adaptation story** is clear: `/team-adapt`, `knowledge/adaptation.md`, `AGENTS.sample.md`, layering note in `team/project.json` — matches marketplace “document install + Duplicate Workspace + localhost MCP.”
- **MCP vs CLI fallback** in rules, session-start, and skills (`team_*` when green; `node dist/cli.js` when catalog empty).

## Risks

- **Med:** **`npm run team:suggest`** / lead routing helper not mentioned in root **README** (only `team_suggest_worker` in [mcp-tools.md](mcp-tools.md) and [knowledge/README.md](README.md)). Marketplace reviewers may miss it.
- **Med:** No root **`AGENTS.md`** in this plugin repo — adapt docs reference it for consumer projects; optional for publish but weakens dogfood of `/team-adapt` on self.
- **Med:** **`mcp.json` port 7391** is fixed; README documents manual edit if `team/config.json` port changes — acceptable v1 footgun.
- **Low:** Worker C window must be running `/team-worker` after reload; inbox nudge does not replace watcher (by design).

## Next

- Add one README subsection: lead may call `team_suggest_worker` or `npm run team:suggest -- --claim <paths>` before delegate (link mcp-tools).
- Optional: add root `AGENTS.md` from sample for plugin self-adapt dogfood.
- Before publish: re-read [test/SMOKE.md](../test/SMOKE.md) with B/C/D windows — confirm no timed `/loop` on workers.
- Do not reintroduce pasteable worker loop prompts in `team:start` JSON or worker commands.
