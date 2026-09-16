# Wave 16 brainstorm — security & protocol (worker F)

**Verdict:** The bus is correctly scoped to loopback, but any local process can still call MCP with arbitrary `agentId` and write coordination files. The highest-value hardening is **path-bound claims** plus **documented threat model** so dogfooders know what localhost trust actually means.

## Top 5 ideas (localhost, MCP sessions, claims, inbox, deps)

### 1. Loopback threat model doc

Name: **`knowledge/security-localhost.md`**

Rationale: Daemon binds `127.0.0.1`, rejects non-local `Host`, and Cursor MCP is user-approved — but that is not “auth,” it is **same-machine trust**. Document who can delegate, spoof workers, and read `team/inbox.jsonl`; link from README Limits and `knowledge/approvals.md`.

- **Effort:** S

### 2. MCP session lifecycle hygiene

Name: **Stale transport sweep**

Rationale: `StreamableHTTPServerTransport` sessions live in an in-memory map until closed; a crashed client can leave sessions around until daemon restart. Add idle TTL + `sessions` count on `/health` so ops can spot leaks; optional `DELETE` or admin tool to drop sessions older than N minutes.

- **Effort:** M

### 3. Claim path normalization (traversal guard)

Name: **`normalizeClaimPath` + enforce on `claimPaths` / order `claim`**

Rationale: `team_claim_paths` and order `claim` arrays accept raw strings with no `..` rejection or workspace-root check. A malicious or confused agent could lease `../../.env` or absolute paths outside the repo. Normalize to forward slashes, reject `..` and drive letters / leading `/`, and optionally require paths under `knowledge/`, `team/`, or repo root.

- **Effort:** S

### 4. Inbox write guardrails

Name: **Inbox sender validation + size cap**

Rationale: `team_inbox_send` / `team_publish_finding` trust `from` without binding to the MCP caller (there is no caller identity). Mitigate prompt-injection and disk fill: require `from` to match a known agent on the board, cap body length (e.g. 8–16 KiB), strip NULs, and rotate `inbox.jsonl` already capped — add test that oversized bodies fail fast.

- **Effort:** M

### 5. Dependency & supply-chain hygiene

Name: **`npm audit` gate + pinned MCP SDK**

Rationale: Runtime is `express` + `@modelcontextprotocol/sdk`; a compromised dependency becomes full local MCP access. Add `npm audit --audit-level=high` to CI or `pack:check`, document override process in `knowledge/security-localhost.md`, and keep SDK on a reviewed minor range in `package.json`.

- **Effort:** M (audit wiring S; policy L if marketplace publishing)

## One shippable next slice (pick)

**Ship #3 — claim path normalization** in `server/store.ts` (shared helper), wire through `claimPaths` and order creation in `team_delegate`, add `test/store.test.ts` cases for `../`, absolute paths, and valid `knowledge/foo.md`. Small diff, directly reduces filesystem abuse via the coordination protocol, and pairs with worker rule “write only claimed paths” without trusting model discipline alone.
