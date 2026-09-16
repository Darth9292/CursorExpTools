# Wave 16 synthesis (B–G → lead)

Harvested 2026-09-15. Full brainstorms: `knowledge/brainstorm-wave16-{B,C,D,E,F,G}.md`.

## Consensus picks (implemented or queued)

| Priority | Idea | Owner lens | Status |
|----------|------|------------|--------|
| P0 | `npm run team:bus-restart` | D | **Shipped** |
| P0 | `npm run smoke:check` | E | **Shipped** |
| P0 | Claim path normalization | F | **Shipped** |
| P1 | Order templates | C | **Shipped** (`knowledge/order-templates/`) |
| P1 | Lead wave closeout skill | G | **Shipped** (`skills/team-lead`) |
| P1 | Watcher coalesce | B | Already 300ms debounce + batched `orderIds` |
| P1 | `team_suggest_worker` | B | Wave 17 |
| P1 | Harvest cursor | B/E | Wave 17 |
| P2 | `includeBoard: false` on join | B/C | Wave 17 |
| P2 | GitHub Actions CI | E | Wave 17 |
| P2 | MCP session TTL | F | Wave 17 |

## User summary template (lead)

After each wave:

1. **Shipped** — what landed in the repo.
2. **Open** — blocked orders or waiting on workers.
3. **You** — bus restart, Duplicate Workspace, or nothing.

## Next wave 17 (suggested)

1. B: `team_suggest_worker` MCP (read-only routing).
2. B: harvest cursor in `team/status.json`.
3. E: `.github/workflows/test.yml`.
4. C: `/team-restart-worker` command doc.
