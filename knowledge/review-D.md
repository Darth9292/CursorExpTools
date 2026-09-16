# Review D — ops / marketplace (Wave 20 quad)

**Date:** 2026-09-15  
**Lens:** Ops & integration — [marketplace.md](marketplace.md) pre-submit checklist, git hygiene, automated gates

## Verdict

**Not ready to submit** — product and automated gates look good; **no public Git repository** in this checkout blocks [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish).

## Score

**7 / 10** (would be **8–9** after public repo + one human SMOKE pass)

## Commands run (this review)

| Command | Result |
|--------|--------|
| `npm run smoke:check` | **pass** — `tsc`, `pack:check`, **86/86** vitest tests |
| `npm run pack:check` | **pass** — **78 files**, tarball **56.4 kB** / unpacked **238.0 kB**; includes `dist/`, `hooks/watch-orders.mjs`, `hooks/start-watcher.mjs`; no `team/orders.json` |
| `git status` / `remote -v` | **NO `.git`** — not a repository; no public clone URL |

## Git / publish state

- **Blocker:** Checklist step 1 ([marketplace.md](marketplace.md)) — create a **public** GitHub/GitLab repo, push this tree, use that URL at publish. This dogfood folder is still offline-only.
- After init: commit **`dist/`** post-build, keep volatile `team/orders.json` and `team/results/` out of git (see `.gitignore`); `team/config.json` + `team/README.md` can stay tracked for dogfood docs.
- **Not verified here:** `npm run link-local`, Reload Window, MCP green, full [test/SMOKE.md](../test/SMOKE.md) two-window pass (checklist steps 5–6).

## Checklist vs [marketplace.md](marketplace.md)

| Step | Status |
|------|--------|
| 1 Public Git | **Fail** — no repo |
| 2 Build + bus-restart note | **Pass** (build in smoke:check) |
| 3 `smoke:check` | **Pass** |
| 4 `pack:check` | **Pass** |
| 5 Local smoke / link-local | **Not run** (human) |
| 6 Docs (README A + B/C/D) | **Pass** (spot-check vs checklist) |
| 7 Submit URL | **Blocked** by step 1 |

**Must be true** section: MIT `LICENSE`, `.cursor-plugin/plugin.json`, `assets/logo.svg`, README localhost docs — present in tree; tarball includes expected plugin layout.

## Strengths

- Wave 18–19 ops docs landed: [test/SMOKE.md](../test/SMOKE.md) covers `team:bus-restart`, MCP toggle vs full quit, B/C/D config; [marketplace.md](marketplace.md) sequences `smoke:check`, bus restart, and README roster pointer.
- [bus-restart.md](bus-restart.md) + SMOKE cross-links reduce stale-`dist` on 7391 confusion (prior review gap largely closed).
- Automated regression surface is strong (**86** tests, pack payload test excludes live board files).
- Dogfood roster is consistent: `team/config.json` workers **B, C, D**; knowledge index and README align.

## Risks

- **High:** Submitting without public Git is impossible; reviewers never see the tree.
- **Med:** Manual multi-window SMOKE and **Allow always** flow still depend on a human; not re-validated on 2026-09-15 in this session.
- **Med:** Uncommitted local edits (knowledge, `team/results/`, dogfood board) have nowhere to land until Git exists — easy to lose pre-publish snapshot.
- **Low:** `resultBody` truncation on the board vs full `team/results/` (documented in [bloat.md](bloat.md)); lead harvest footgun only.

## Next (exact blockers before publish)

1. **`git init` → public remote → push`** — satisfy marketplace step 1; URL ready for the publish form.
2. **One full SMOKE pass** — `link-local`, Duplicate Workspace, A + B/C/D workers, watcher wake (no `/loop`); confirm MCP after any `team:bus-restart`.
3. **Commit policy** — built `dist/` in repo; exclude live orders/results; verify `npm pack --dry-run` on the **pushed** commit matches local (78 files).
4. **Optional:** Run publish dry-run from a clean clone of the public repo to mimic reviewer install (`npm install --omit=dev` in plugin folder).

After **1** and **2**, re-run `npm run smoke:check` on the publish branch and submit at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish).
