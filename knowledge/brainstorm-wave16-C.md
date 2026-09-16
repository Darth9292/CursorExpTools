# Wave 16 brainstorm — plugin UX (worker C)

## Verdict

The plugin UX is solid on boot and anti-loop, but leads still burn tokens on fat MCP payloads and vague delegate briefs; the highest-leverage UX win is templated orders plus explicit “heartbeat-only” join guidance in skills/rules.

## Top 5 ideas (plugin UX)

### 1. Order brief templates (`knowledge/order-templates/`)

Lead copies a skeleton (doc-only, test-only, review, SMOKE) into `team_delegate` instead of improvising each wave.
Cuts variance, shortens worker confusion, and matches roadmap P1 #4 without server changes.

**Effort:** S

### 2. `/team-restart-worker` slash command

Single command doc mirroring `team-worker`: kill stale PIDs via `team/watchers/<id>.pid`, then `start-watcher.mjs` with `--root`.
Reduces “wrong watcher” support burden after Reload Window or duplicate processes.

**Effort:** S

### 3. Lead skill: “compact heartbeat” join pattern

Document that routine `team_join` / `team_status` should set `doing` only; harvest for history; never paste board JSON to the user.
Aligns with shipped compact board and teaches token discipline in the lead loop skill.

**Effort:** S

### 4. Rule: worker one-line user contract

Always-on rule bullet: workers reply one line to the human (`idle`, `done <id>`, or blocked); all detail in `team_report` + `knowledge/`.
Stops worker chats from becoming second leads and keeps user windows readable.

**Effort:** S

### 5. `/team-adapt` + `/team-start` checklist command

One markdown command the lead runs once: adapt → start → duplicate → worker ids table from `config.workers`.
Consumer repos stop skipping adapt; ties sessionStart hints to a single user-visible flow.

**Effort:** M

## One shippable next slice

**Ship #1 — `knowledge/order-templates/` + one paragraph in `skills/team-lead/SKILL.md` and `commands/team-lead.md`:** add 3–4 markdown templates and tell the lead to paste/adapt them in `team_delegate`. No server work; immediate dogfood value for waves like 16.
