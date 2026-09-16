# Marketplace publish (Cursor)

Official listing is **not** `npm publish` and **not** cursor.directory. Cursor clones a **public Git repository**, reviews it by hand, then lists it on [cursor.com/marketplace](https://cursor.com/marketplace).

## Pre-submit checklist (run in order)

1. **Public Git** — Create a public GitHub/GitLab repo and push this tree. This dogfood checkout may have no `.git` yet; reviewers need a normal clone URL, not a zip of your laptop folder.
2. **Build** — `npm install` (dev ok for build), then `npm run build`. Confirm `dist/ensure-daemon.js` and `dist/daemon.js` exist. If you already had the bus listening, run **`npm run team:bus-restart`** so `/health` matches the new `dist/` ([bus-restart.md](bus-restart.md)).
3. **Automated smoke gate** — From the repo root:
   ```bash
   npm run smoke:check
   ```
   Runs `build`, `pack:check`, and `npm test`. Fix failures before listing.
4. **Pack dry-run** — Or run alone:
   ```bash
   npm run pack:check
   ```
   Same as `npm pack --dry-run`. Expect `package.json` `files[]` entries (`.cursor-plugin/`, `dist/`, `hooks/`, `skills/`, …). **Must not** include `node_modules/`, `team/orders.json`, `team/results/`, or other live board files (see `.gitignore`).
5. **Local smoke** — `npm run link-local`, Reload Window, `agent-team` MCP green; skim [test/SMOKE.md](../test/SMOKE.md) (bus restart + MCP toggle vs full quit).
6. **Docs sanity** — [README.md](../README.md) documents install, Duplicate Workspace, localhost MCP, lead routing (`team_suggest_worker` / `npm run team:suggest`), and default dogfood roster **lead A + workers B/C/D** (`team/config.json`; E–G optional). Root [AGENTS.md](../AGENTS.md) is the adapt default for this plugin repo; [knowledge/README.md](README.md) indexes the rest.
7. **Submit** — [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish) → paste the **public** repository URL → wait for email (no public status page; updates are re-reviewed per [publisher terms](https://cursor.com/marketplace-publisher-terms)).

cursor.directory is a **different**, faster community listing. It does not put you on the official marketplace.

## Must be true before submit

- Open source (MIT `LICENSE` in the repo).
- Valid [`.cursor-plugin/plugin.json`](../.cursor-plugin/plugin.json): kebab-case `name`, description, relative paths only (no `..`).
- Logo at `assets/logo.svg`, referenced as `"logo": "assets/logo.svg"`.
- `README.md` documents install, Duplicate Workspace leftover, and localhost MCP (`127.0.0.1:7391`).
- Tested from `%USERPROFILE%\.cursor\plugins\local\cursor-agent-team` (`npm run link-local`, Reload Window).
- **`dist/` is part of the product** (hooks spawn `dist/ensure-daemon.js`). Commit `dist/` after build; do **not** gitignore it. Do not commit `node_modules/`. After clone, consumers run `npm install --omit=dev` in the plugin folder (`link-local` already does this).
- Live dogfood board stays out of git so reviewers do not see this workspace’s transcripts. `.gitignore` excludes volatile `team/*` paths; keep `team/config.json` + `team/README.md` tracked if you still dogfood this repo.

## Reviewers will see

- A localhost Streamable HTTP MCP daemon (Node). That is expected; document bind `127.0.0.1` only.
- Hooks that spawn Node. Fail-open; no secrets in the repo.
- The human leftover: Duplicate Workspace, **Allow always**, `/team-worker`.
