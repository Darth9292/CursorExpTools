---
name: team-bus-start
description: Start or reuse the localhost agent-team HTTP MCP daemon
---

Ensure the agent-team bus is running on `127.0.0.1:7391` (or `team/config.json` `port`).

1. Run the plugin ensure script with Node:
   - `node "%USERPROFILE%\.cursor\plugins\local\cursor-agent-team\dist\ensure-daemon.js"`
   - PowerShell: `node "$env:USERPROFILE\.cursor\plugins\local\cursor-agent-team\dist\ensure-daemon.js"`
   - If this repo is the plugin cwd: `npm run ensure:bus`
2. `GET http://127.0.0.1:7391/health` must return `"ok": true`.
3. If the `agent-team` MCP is red in Customize, toggle it after health is OK.
4. Report the health JSON. Do not start a second listener if health already succeeds.
5. To pick up `dist/` changes, stop the process on port **7391** then `ensure:bus` (or the lead restarts it). A live listener is reused and will not load new `dist`.
