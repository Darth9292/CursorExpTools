# Disk caps (stay tiny vs Cursor)

This plugin must stay **tiny** next to Cursor. Git-visible `team/` is a radio, not an archive. Cap the hot files; keep full write-ups on disk where harvest already looks.

## Caps

- **`orders.json` `resultBody`:** 240 characters. The full write-up lives in `team/results/<orderId>.md`. When an order is done, its stored `brief` is emptied; that file keeps the text.
- **`inbox.jsonl`:** last **100** lines. Older questions/findings drop off. Each message body capped at **16 384** characters. Append does not reread the file while it is under 100 lines.
- **`activity.jsonl`:** not used. Do not grow it; it is gitignored.
- **MCP `team_status`:** live roster only (lead + `config.workers`), open/claimed orders only, and those orders omit `brief`. Workers `team_poll` for the brief. `node dist/cli.js status` uses the same snapshot.
- **`team_harvest`:** returns only `id`, `to`, `title`, `status`, `resultBody`, `resultPath`, `updatedAt`.
- **Done orders:** live board keeps at most **50** done orders; `team/results/*.md` stay. `report()` writes that markdown after releasing the board lock.
- **Heartbeat:** an unchanged heartbeat does not rewrite `status.json`.
- **`team_delegate`:** adds domain and persona to the brief. It does not append the layering paragraph (that stays in the rule and `knowledge/project.md`).
- **`team_join`:** workers and lead heartbeats pass `includeBoard: false`.
- After `dist/` changes, **restart** the localhost bus. `ensure:bus` does not reload a live listener.
- `%USERPROFILE%\.cursor\plugins\local\cursor-agent-team` is a **copy**; after dist caps, re-run `npm run link-local` from the plugin repo or that copy stays stale (does not grow Cursor disk beyond one copy).

Do **not** gitignore `team/results/`. Lead harvest and humans need those files.
