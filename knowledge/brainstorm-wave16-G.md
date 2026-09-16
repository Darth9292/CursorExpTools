# Wave 16 brainstorm — lead coordination (worker G)

**Lens:** Agent A only talks to the human; workers stay one-line; lead owns harvest cadence, parallel bursts, token budget, subagent vs worker, and user-facing summaries.

## Verdict

B/C/D already cover runtime compaction, templates, and `team:bus-restart`. The lead gap is a **repeatable wave loop**: harvest before delegate, batch parallel orders without re-explaining the board to the user, and reserve subagents for read-only search so workers are not used as grep bots.

## Top 5 ideas (lead coordination)

### 1. Harvest-on-continue protocol

Every user “continue” or end-of-wave: `team_harvest` first, then `team_status` only if something is still open/blocked. Never delegate on a stale board.

- **Rationale:** Matches shipped compact board; stops duplicate work and duplicate result bodies in lead context (pairs with B’s harvest cursor).
- **Effort:** S (skill + rule bullets only)

### 2. Parallel wave checklist

For N specialists: one `team_delegate` burst (same `mode: parallel`), shared `doneWhen`, distinct `claim` paths; wait for all `done` or one `blocked` before the next user summary.

- **Rationale:** Wave 16 SMOKE (B–G) proved the pattern; documenting it cuts lead improvisation and aligns with B’s watcher coalesce.
- **Effort:** S

### 3. Token budget: heartbeat joins

Routine `team_join` sets `doing` only; optional future `includeBoard: false`. History lives in `team_harvest` + `team/results/`, not pasted into chat.

- **Rationale:** C’s “compact heartbeat” + roadmap P1 #7; lead is the main token spender.
- **Effort:** S (docs now; M when MCP flag lands)

### 4. Subagent vs worker routing

**Task/explore** for search, read, and “where is X”; **workers** only for claimed writes and `team_report`. Lead does not delegate doc-only greps to B.

- **Rationale:** Fills gap vs B’s `team_suggest_worker` (runtime); lead skill is the policy layer before any MCP helper exists.
- **Effort:** S

### 5. User-facing comms: one wave summary

After harvest, one short message to the human: what shipped, what’s open, what they need to do (e.g. bus restart, Duplicate Workspace). No per-worker play-by-play.

- **Rationale:** C’s one-line worker contract only works if the lead owns the narrative; reduces noise in multi-window dogfood.
- **Effort:** S

## Gaps vs B / C / D (not re-litigating)

| Area | They own | Lead should not duplicate |
|------|----------|---------------------------|
| Watcher coalesce | B #3 | — |
| Order templates | C #1 | Lead *uses* templates, does not rewrite server |
| `team:bus-restart` | D slice | Lead *mentions* in summary when `distStale` |
| Blocked inbox UX | Roadmap P1 #5 | Good wave 17; not P0 |

## One shippable next slice for Agent A

**Ship #1 + #5 together — “Wave closeout” in `skills/team-lead/SKILL.md` (and one mirror in `commands/team-lead.md`):**

1. On continue → `team_harvest` → scan for `blocked` / open.  
2. If delegating a parallel wave → use C’s order templates + checklist #2.  
3. Reply to user with template: **Shipped / Open / You** (3 bullets max).

No server changes; immediately improves every wave after 16.
