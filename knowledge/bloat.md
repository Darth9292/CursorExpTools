# Disk caps (stay tiny vs Cursor)

This plugin must stay **tiny** next to Cursor. Git-visible `team/` is a radio, not an archive. Cap the hot files; keep full write-ups on disk where harvest already looks.

## Caps

- **`orders.json` `resultBody`:** 240 characters. The full write-up lives in `team/results/<orderId>.md`.
- **`inbox.jsonl`:** last **100** lines. Older questions/findings drop off. Each message body capped at **16 384** characters.
- **`activity.jsonl`:** not used. Do not grow it; it is gitignored.
- **MCP `team_status`:** omits done-order briefs so the board payload stays small.
- **Done orders:** live board keeps at most **50** done orders; `team/results/*.md` stay.
- After `dist/` changes, **restart** the localhost bus. `ensure:bus` does not reload a live listener.
- `%USERPROFILE%\.cursor\plugins\local\cursor-agent-team` is a **copy**; after dist caps, re-run `npm run link-local` from the plugin repo or that copy stays stale (does not grow Cursor disk beyond one copy).

Do **not** gitignore `team/results/`. Lead harvest and humans need those files.
