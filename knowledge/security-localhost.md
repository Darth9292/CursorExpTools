# Localhost trust model

The team bus listens on **127.0.0.1** only. Non-local `Host` headers are rejected.

That is **not authentication**. Any process on your machine can call MCP tools if Cursor has approved the connection. Treat `team_delegate`, `team_claim_paths`, and inbox writes as **coordination**, not secrets storage.

## Do

- Keep `team/` and `knowledge/` in gitignore for live boards when dogfooding.
- Use **claim paths** (repo-relative, no `..`) so workers only touch leased files.
- Restart the bus after `dist/` changes: `npm run team:bus-restart`.

## Do not

- Store credentials in `team/inbox.jsonl` or order briefs.
- Point claims at paths outside the repo (`../`, absolute paths).

See also [approvals.md](approvals.md) and [mcp-tools.md](mcp-tools.md).
