# cursor-agent-team

Source: [github.com/Darth9292/CursorExpTools](https://github.com/Darth9292/CursorExpTools)

A Cursor plugin for **multiple classic IDE windows** on the same project: you talk only to **Agent A (lead)**; extra windows run **workers** that execute A's orders. They share a git-visible `team/` board plus a localhost Streamable HTTP MCP bus.

Cursor cannot inject a message into another chat. This plugin is the workaround: MCP tools plus a file watcher that wakes a worker **only when they get a new order** (not a 1-minute `/loop`).

## What you get

- Slash commands: `/team-start` (lead one-shot), `/team-adapt`, `/team-init`, `/team-bus-start`, `/team-lead`, `/team-worker`
- MCP server `agent-team` at `http://127.0.0.1:7391/mcp`
- Always-on rule that **no-ops** unless the current project has `team/config.json` with `"enabled": true`
- `sessionStart` hook that starts the bus and reminds the agent to join

## Install (Windows)

Requires **Node.js 20+** (`node` on PATH). Run `npm run link-local` from this plugin repo (`cd` to the checkout), not `C:\Windows\System32`.

```powershell
npm install
npm run link-local
```

That copies the plugin to `%USERPROFILE%\.cursor\plugins\local\cursor-agent-team` (Cursor skips symlinks that point outside that folder). Then **Developer: Reload Window**. After `dist/` changes, re-run `npm run link-local` from this repo (not System32) so that copy is not stale, then Reload Window. `link-local` finds `npm` next to `node.exe`, so shells without `npm` on PATH still work (Windows runs `npm-cli.js`, not `shell: true`).

Alternatively: Customize → install this folder as a project or user plugin.

Enable the **agent-team** MCP after the bus is healthy. If it is red, start the bus first:

```powershell
npm run ensure:bus
# or
node $env:USERPROFILE\.cursor\plugins\local\cursor-agent-team\dist\ensure-daemon.js
```

Health check: `http://127.0.0.1:7391/health`

Changing the port: set `"port"` in the project's `team/config.json` **and** `AGENT_TEAM_PORT`, restart the daemon, and edit the plugin `mcp.json` url to match. v1 does not rewrite `mcp.json` for you (default **7391**).

## Easy start (Agent A initiates)

In this chat, the lead should run **`/team-start`** or:

```powershell
npm run team:start
```

That scaffolds `team/`, starts the bus if needed, joins as agent **A**, and on a **fresh** board seeds a small smoke order for each worker in `team/config.json` (B, C, D, …). The JSON is for the lead only — it does **not** include a pasteable `/loop` or `workerLoop` prompt; workers boot only via `/team-worker` in duplicated windows.

In this chat, run **`/team-adapt`** next (or `npm run team:adapt`) so B/C/D match this repo — see [Adapting to your project](#adapting-to-your-project). You still have to:

1. **Workspaces: Duplicate Workspace in New Window**
2. In the new window: `/team-worker` (agent **B**; poll once, then `hooks/start-watcher.mjs` — **not** a 1m `/loop`)
3. Optional: duplicate again and `/team-worker C` (then D…Z, then 1, 2, 3…)

If you **Reload Window** in a worker chat, run `/team-worker` again there — the background watcher does not survive reload.

**First-run approvals:** a new Duplicate Workspace window often pauses on a Cursor **Allow** card (MCP or localhost). Click **Allow always** once. Details: [knowledge/approvals.md](knowledge/approvals.md).

This plugin repo is meant to dogfood itself that way.

## Use on another project

1. Install this plugin (`npm run link-local` from the plugin repo, then Reload Window).
2. Open the other repo.
3. In the lead chat: `/team-start`
4. In the same lead chat: **`/team-adapt`** (specialist roles for this repo — see below).
5. Duplicate Workspace; if Allow, click **Allow always** (localhost / agent-team MCP).
6. In the copy: `/team-worker` (watcher, not a timed loop). Talk only to the lead.

The lead harvests when you say **continue**. Do **not** leave `/loop 2m` running — that is also a billed prompt every tick. Unattended harvest, if you insist: `/loop 1h`, not 2m.

## Adapting to your project

Full guide: [knowledge/adaptation.md](knowledge/adaptation.md).

The team layer **coordinates windows only** (lead/worker, `team_delegate`, orders watcher). Your existing `.cursor/rules`, `AGENTS.md`, and user prompts stay authoritative for domain work — `/team-adapt` writes `knowledge/project.md` and `team/project.json` so B/C/D are specialists **on top of** that stack, not a replacement.

**Priority:** personas default from repo **`AGENTS.md`** (see [knowledge/examples/AGENTS.sample.md](knowledge/examples/AGENTS.sample.md)); anything you describe in chat **overrides** those worker ids when the lead calls `team_adapt` / `/team-adapt`.

**Flow:** `/team-start` → **`/team-adapt`** in the lead chat → Duplicate Workspace → `/team-worker` per window. Re-run `/team-adapt` when focus shifts (new mod, new target platform, etc.).

If `team_adapt` is missing from the MCP catalog, restart the bus on port **7391** (see [knowledge/mcp-tools.md](knowledge/mcp-tools.md)) or run `npm run team:adapt` from the project root.

**Examples:** PS3 reverse engineering — B MIPS/static analysis, C tooling/scripts, D docs and harness; DayZ modding — B Enfusion gameplay, C assets/PBO, D server config and balancing.

## Layout in the consuming project

Created by `/team-init`:

- `team/config.json` — `enabled`, `port`, `leadId`, `workers`
- `team/status.json` — heartbeats
- `team/orders.json` — lead-issued work
- `team/inbox.jsonl` — questions / findings
- `team/claims.json` — path leases (30 minutes default)
- `team/results/<orderId>.md` — worker write-ups
- `team/project.json` — machine specialist profile (from `/team-adapt`)
- `team/watchers/<id>.pid` — live watcher PIDs (gitignored; not shipped)
- `knowledge/project.md` — human-readable specialist roles
- `knowledge/` — other durable facts (plugin does not interpret them)

Identity is **per chat**, not per file. Both windows share the disk, so `/team-lead` vs `/team-worker` is how a window picks a role.

## MCP tools

Both roles: `team_join`, `team_whoami`, `team_status`, `team_inbox_read`, `team_inbox_send`, `team_publish_finding`, `team_claim_paths`, `team_release_paths`

Lead: `team_delegate`, `team_harvest`, `team_cancel`, `team_nudge`, `team_adapt`, `team_read_project`, `team_suggest_worker`

Worker: `team_poll`, `team_claim_order`, `team_report`, `team_ask_lead`

Bootstrap: `team_start` (lead one-shot), `team_scaffold` (no join required)

Full table: [knowledge/mcp-tools.md](knowledge/mcp-tools.md)

Every tool takes optional `workspaceRoot` (inferred from `pwd` / `team/config.json` when omitted) and `agentId` on mutating calls. Join before the rest. Never ask the human to paste a project path.

### Routing orders (lead)

Before `team_delegate`, rank workers from path hints (read-only):

```powershell
npm run team:suggest -- --claim server/mcp-tools.ts
# optional: --hint "docs pass"   --root <absolute project root>
```

Same JSON shape as MCP `team_suggest_worker`. Requires `npm run build` (or a fresh `smoke:check`) so `dist/suggest-worker-cli.js` exists.

## Dev

```powershell
npm install
npm test
npm run build
npm run start:bus
```

If `agent-team` MCP tools are missing (`/health` can still be ok), do not hand-edit `team/*.json`. From this repo:

```powershell
node dist/cli.js harvest --agent A
npm run team:harvest
npm run team:status
npm run team:adapt
npm run team:suggest -- --claim knowledge/marketplace.md
node dist/cli.js join --agent D --role worker
# B / C: same join with --agent B or --agent C
node dist/cli.js poll --agent B
node dist/cli.js poll --agent C
node dist/cli.js poll --agent D
# then: node dist/cli.js claim --agent B --order <id>
# then: node dist/cli.js report --agent B --order <id> --body "..."
```

Omit `--root` (`pwd` / `team/config.json`). Rebuild with `npm run build` only if `dist/cli.js` is missing.

Manual multi-window checks: [test/SMOKE.md](test/SMOKE.md)

## Limits

- **Workers never use a timed `/loop`.** Idle is silent until `hooks/start-watcher.mjs` (or `watch-orders.mjs`) prints `AGENT_TEAM_WAKE` for a new open order, or you prompt that chat. A 1m `/loop` is still a billed prompt every tick — do not use it for workers.
- After **Reload Window** in a worker chat, run `/team-worker` again (the watcher is not persisted).
- Workers wake when `team/orders.json` gains a **new open** order for them, or when you prompt that chat.
- Same checkout: isolation is **claims**, not git worktrees.
- Localhost only. Cloud Agents will not see this bus.
- The live `team/` board is capped (`resultBody` 240 chars, inbox 100 lines / 16 KB per message, 50 done orders). Workers and lead heartbeats call `team_join` with `includeBoard: false`. `team_status` and `node dist/cli.js status` list only the live roster and open/claimed orders, without briefs; workers `team_poll` for the brief. Done orders keep an empty `brief`; the full text stays in `team/results/`. `team_harvest` returns a short result. Delegate adds domain and persona, not the layering paragraph. See [knowledge/bloat.md](knowledge/bloat.md).
- After `dist/` changes, restart the localhost bus so the running daemon picks them up.
