# Perf review: prompt and turn cost

Date: 2026-09-21  
Reviewer: worker C (Plugin UX & docs)  
Scope: read-only. No production code changed.

## Verdict

Idle no longer bills a timed `/loop`. Done orders are off `team_status`, and `resultBody` is capped. The remaining cost is the **wake turn**: the same persona and layering paragraph are stored on the order, returned by `team_poll`, returned again by `team_claim_order`, and then `rules/agent-team.mdc` makes every window call `team_status`, which still inlines **every** open brief and **every** agent who ever joined.

Skills are not the heavy part. `skills/team-worker/SKILL.md` is 3.6KB, `skills/team-lead/SKILL.md` 3.6KB, `skills/team-start/SKILL.md` 2.2KB, and the always-apply rule is 2.5KB. What grows the next generation is pretty-printed board JSON.

## Score

**6/10.** Caps and the watcher are the right shape. Each parallel wake still pays for sibling briefs and a thrice-copied role blurb.

## Findings

1. **High — `rules/agent-team.mdc` rule 4 + `boardSnapshotForMcp` (`server/mcp-tools.ts`).**  
   Cost: one extra MCP payload per worker wake, and the same payload on every lead turn. On this wake, `team_status` included worker B’s full brief as well as C’s (two ~1KB briefs, pretty-printed). `activeOrdersForMcp` drops `done` orders only; open and claimed orders keep `brief`.  
   Change: workers call `team_poll` only. In the rule, limit `team_status` to the lead, and only when something is open or blocked (the lead skill already says this; the always-apply rule undoes it). For status, return `id`, `to`, `title`, `status`, `claim` — omit `brief`.

2. **High — `enrichDelegateBrief` (`server/project-profile.ts`).**  
   Cost: ~500–700 characters appended to **every** stored brief: `## Project context`, `## Your role`, and `DEFAULT_LAYERING_NOTE` (~230 characters). That note is already rule 13 and `knowledge/project.md` (729 bytes). `team_poll` also returns `persona`. `claimOrder` (`server/store.ts`) returns the whole order, so one wake carries the brief three times (poll, status, claim).  
   Change: store the lead’s brief unchanged. Keep persona on `team_poll` only. Drop the layering footer. Make `team_claim_order` return `{ id, status }`.

3. **Med — worker join still defaults `includeBoard: true`.**  
   Cost: boot `team_join` (`server/mcp-tools.ts`, `joinPayloadForMcp`) embeds the active board. This session’s join included a claimed order from 2026-09-16 plus agents E/F/G. `skills/team-lead/SKILL.md` already says heartbeat joins use `includeBoard: false`. `skills/team-worker/SKILL.md` and rule 2 do not.  
   Change: worker boot calls `team_join` with `includeBoard: false`, then `team_poll`.

4. **Med — `getBoard` never drops stale agents (`server/store.ts`).**  
   Cost: status lists every `status.agents` entry. E, F, and G (last seen 2026-09-15) still ship a paragraph of `lastResult` on every snapshot.  
   Change: status agents = lead + `config.workers` only, and omit `lastResult` (it is not needed to claim work).

5. **Med — rule 14 and the worker skill tell every poll to read `knowledge/project.md`.**  
   Cost: an extra file read and another model step inside the wake, for 729 bytes that duplicate `persona` and the brief footer. The skill file itself is not re-read from disk on wake; the transcript already holds it. The billed waste is the redundant read plus prior pretty-printed boards (`jsonResult` uses `JSON.stringify(..., null, 2)`).  
   Change: delete the “read `knowledge/project.md`” line from rule 14 and `skills/team-worker/SKILL.md`. Emit compact JSON for poll, status, and join.

6. **Low — MCP tool catalog is the standing prompt, not the skills.**  
   Cost: this server’s tool descriptors are about 22KB, and the same `workspaceRoot` paragraph is copied onto every tool. That list is present on every wake whether or not an order is large.  
   Change: shorten `workspaceRoot` / `agentId` descriptions to one line.

7. **Low — `knowledge/bloat.md` and README Limits understate the hot path.**  
   They say status “omits done-order briefs.” The code drops done orders entirely, which is better, and they never say that **open** briefs and dead agents are still inline. Leads will treat `team_status` as cheap.  
   Change: one Limits sentence: status includes full open briefs and all historical agents; workers should poll only and join with `includeBoard: false`.
