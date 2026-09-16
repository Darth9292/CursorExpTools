import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import lockfile from "proper-lockfile";
import {
  DEFAULT_CLAIM_TTL_MS,
  DEFAULT_CONFIG,
  type AgentStatus,
  type Claim,
  type ClaimsFile,
  type HarvestFile,
  type InboxMessage,
  type InboxType,
  type Order,
  type OrderMode,
  type OrdersFile,
  type Role,
  type StatusFile,
  type TeamConfig,
} from "./types.js";
import { normalizeClaimPath, normalizeClaimPaths } from "./claim-paths.js";
import { canonicalizeAgentId, nextWorkerId } from "./ids.js";
import { PROJECT_MARKDOWN_TEMPLATE } from "./project-profile.js";

function canonicalizeSafe(raw: string): string {
  if (raw === "*") return "*";
  try {
    return canonicalizeAgentId(raw);
  } catch {
    return raw;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

export const RESULT_BODY_CAP = 240;
export const INBOX_KEEP_LINES = 100;
export const INBOX_MAX_BODY_CHARS = 16_384;
export const KEEP_DONE_ORDERS = 50;

function capResultBody(body: string | null): string | null {
  if (body == null) return body;
  return body.length <= RESULT_BODY_CAP ? body : body.slice(0, RESULT_BODY_CAP);
}

function shortId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    if (!raw.trim()) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return fallback;
    throw err;
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export const TEAM_README = `# Agent team board

This folder is the shared radio for Cursor IDE windows on this project.

- You talk only to the **lead** chat (\`/team-lead\`).
- Extra windows run \`/team-worker\` and wait on \`hooks/watch-orders.mjs\` (not a timed \`/loop\`).
- Durable facts go in \`knowledge/\`. Chatty coordination stays here.

## Files

- \`config.json\` — enable flag, bus port, lead/worker ids
- \`status.json\` — per-agent heartbeat
- \`orders.json\` — lead-issued work
- \`inbox.jsonl\` — questions, answers, findings
- \`claims.json\` — path leases (default 30 minutes)
- \`results/<orderId>.md\` — worker write-ups
- \`harvest.json\` — lead harvest cursors
- \`project.json\` — specialist personas (from \`/team-adapt\`)
- \`watchers/<id>.pid\` — local watcher PIDs (gitignored)

## Order modes

- \`parallel\` — worker does Y while lead continues X
- \`assist\` — worker investigates; lead stays owner of the user conversation
- \`handoff\` — worker becomes owner of that slice until done
`;

export const KNOWLEDGE_README = `# Knowledge

Durable facts for this project (symbols, structs, decisions).
The agent-team plugin does not interpret these files; they are a convention.

- \`project.md\` — domain summary and per-worker specialist roles for this repo (see \`/team-adapt\` in the lead chat).
`;

export class TeamStore {
  readonly root: string;
  readonly teamDir: string;

  constructor(workspaceRoot: string) {
    this.root = path.resolve(workspaceRoot);
    this.teamDir = path.join(this.root, "team");
  }

  async scaffold(): Promise<void> {
    await mkdir(path.join(this.teamDir, "results"), { recursive: true });
    await mkdir(path.join(this.root, "knowledge"), { recursive: true });
    await this.ensureLockFile();

    const writeIfMissing = async (rel: string, contents: string) => {
      const full = path.join(this.root, rel);
      try {
        await readFile(full, "utf8");
      } catch {
        await mkdir(path.dirname(full), { recursive: true });
        await writeFile(full, contents, "utf8");
      }
    };

    await writeIfMissing("team/config.json", `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`);
    await writeIfMissing("team/status.json", `${JSON.stringify({ agents: {} } satisfies StatusFile, null, 2)}\n`);
    await writeIfMissing("team/orders.json", `${JSON.stringify({ orders: [] } satisfies OrdersFile, null, 2)}\n`);
    await writeIfMissing("team/claims.json", `${JSON.stringify({ claims: [] } satisfies ClaimsFile, null, 2)}\n`);
    await writeIfMissing("team/harvest.json", `${JSON.stringify({ cursors: {} } satisfies HarvestFile, null, 2)}\n`);
    await writeIfMissing("team/inbox.jsonl", "");
    await writeIfMissing("team/README.md", TEAM_README);
    await writeIfMissing("knowledge/README.md", KNOWLEDGE_README);
    await writeIfMissing("knowledge/project.md", PROJECT_MARKDOWN_TEMPLATE);
    await this.mergeGitignore();
    const cfg = (await this.readConfig()) ?? { ...DEFAULT_CONFIG };
    cfg.workspaceRoot = this.root;
    await writeFile(
      path.join(this.teamDir, "config.json"),
      `${JSON.stringify(cfg, null, 2)}\n`,
      "utf8",
    );
  }

  async readConfig(): Promise<TeamConfig | null> {
    const file = path.join(this.teamDir, "config.json");
    try {
      const raw = await readFile(file, "utf8");
      const parsed = JSON.parse(raw) as Partial<TeamConfig>;
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        workers: parsed.workers ?? DEFAULT_CONFIG.workers,
      };
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return null;
      throw err;
    }
  }

  async requireEnabled(): Promise<TeamConfig> {
    const config = await this.readConfig();
    if (!config || !config.enabled) {
      throw new Error(
        "Agent team is not enabled. Run /team-init in this project (missing or disabled team/config.json).",
      );
    }
    return config;
  }

  async join(agentId: string, role: Role, doing = "joined"): Promise<AgentStatus> {
    return this.withLock(async () => {
      const id = canonicalizeAgentId(agentId);
      const config = await this.requireEnabled();
      await this.ensureAgentAllowed(config, id, role);
      const status = await this.loadStatus();
      const agent: AgentStatus = {
        id,
        role,
        doing,
        lastResult: status.agents[id]?.lastResult ?? "",
        ts: nowIso(),
      };
      status.agents[id] = agent;
      await this.saveStatus(status);
      return agent;
    });
  }

  async whoami(agentId: string): Promise<AgentStatus> {
    return this.requireAgent(agentId);
  }

  async getBoard(): Promise<{
    config: TeamConfig;
    agents: AgentStatus[];
    orders: Order[];
    claims: Claim[];
  }> {
    const config = await this.requireEnabled();
    const [status, ordersFile, claimsFile] = await Promise.all([
      this.loadStatus(),
      this.loadOrders(),
      this.loadClaims(),
    ]);
    const claims = this.activeClaims(claimsFile.claims);
    return {
      config,
      agents: Object.values(status.agents),
      orders: ordersFile.orders.filter((o) => o.status !== "cancelled"),
      claims,
    };
  }

  async heartbeat(agentId: string, doing?: string, lastResult?: string): Promise<AgentStatus> {
    return this.withLock(async () => {
      const agent = await this.requireAgent(agentId);
      if (doing !== undefined) agent.doing = doing;
      if (lastResult !== undefined) agent.lastResult = lastResult;
      agent.ts = nowIso();
      const status = await this.loadStatus();
      status.agents[agent.id] = agent;
      await this.saveStatus(status);
      return agent;
    });
  }

  async delegate(input: {
    from: string;
    to: string;
    mode: OrderMode;
    title: string;
    brief: string;
    claim?: string[];
    doneWhen: string;
  }): Promise<Order> {
    return this.withLock(async () => {
      await this.requireRole(input.from, "lead");
      const config = await this.requireEnabled();
      const from = canonicalizeAgentId(input.from);
      const to = input.to === "*" ? "*" : canonicalizeAgentId(input.to);
      if (to !== "*") {
        await this.ensureAgentAllowed(config, to, "worker");
      }
      const order: Order = {
        id: shortId("ord"),
        from,
        to,
        mode: input.mode,
        status: "open",
        title: input.title,
        brief: input.brief,
        claim: input.claim?.length ? normalizeClaimPaths(input.claim) : [],
        doneWhen: input.doneWhen,
        resultPath: null,
        resultBody: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      const orders = await this.loadOrders();
      orders.orders.push(order);
      await this.saveOrders(orders);
      if (order.claim.length) {
        await this.upsertClaims(order.claim, to === "*" ? from : to, order.id);
      }
      await this.touchAgent(from, `delegated ${order.id}: ${order.title}`);
      return order;
    });
  }

  async poll(workerId: string): Promise<Order[]> {
    const id = canonicalizeAgentId(workerId);
    const status = await this.loadStatus();
    if (!status.agents[id]) {
      await this.join(id, "worker", "auto-joined on poll");
    }
    await this.requireRole(id, "worker");
    const orders = await this.loadOrders();
    return orders.orders.filter(
      (o) =>
        (o.to === id || o.to === "*" || canonicalizeSafe(o.to) === id) &&
        (o.status === "open" || (o.status === "claimed" && canonicalizeSafe(o.to) === id)),
    );
  }

  async claimOrder(workerId: string, orderId: string): Promise<Order> {
    return this.withLock(async () => {
      const id = canonicalizeAgentId(workerId);
      await this.requireRole(id, "worker");
      const orders = await this.loadOrders();
      const order = orders.orders.find((o) => o.id === orderId);
      if (!order) throw new Error(`Order '${orderId}' not found`);
      if (canonicalizeSafe(order.to) !== id && order.to !== "*") {
        throw new Error(`Order '${orderId}' is assigned to '${order.to}', not '${id}'`);
      }
      if (order.status !== "open" && !(order.status === "claimed" && canonicalizeSafe(order.to) === id)) {
        throw new Error(`Order '${orderId}' is ${order.status}, cannot claim`);
      }
      order.to = id;
      order.status = "claimed";
      order.updatedAt = nowIso();
      await this.saveOrders(orders);
      if (order.claim.length) {
        await this.upsertClaims(order.claim, id, order.id);
      }
      await this.touchAgent(id, `claimed ${order.id}: ${order.title}`);
      return order;
    });
  }

  async report(
    workerId: string,
    orderId: string,
    status: "done" | "blocked",
    body: string,
  ): Promise<Order> {
    return this.withLock(async () => {
      const id = canonicalizeAgentId(workerId);
      await this.requireRole(id, "worker");
      const orders = await this.loadOrders();
      const order = orders.orders.find((o) => o.id === orderId);
      if (!order) throw new Error(`Order '${orderId}' not found`);
      if (canonicalizeSafe(order.to) !== id) {
        throw new Error(`Order '${orderId}' is not claimed by '${id}'`);
      }
      order.status = status;
      order.resultBody = capResultBody(body);
      order.resultPath = path.join("team", "results", `${order.id}.md`).replaceAll("\\", "/");
      order.updatedAt = nowIso();
      await mkdir(path.join(this.teamDir, "results"), { recursive: true });
      await writeFile(
        path.join(this.teamDir, "results", `${order.id}.md`),
        `# ${order.title}\n\n- id: ${order.id}\n- worker: ${id}\n- status: ${status}\n- updated: ${order.updatedAt}\n\n${body}\n`,
        "utf8",
      );
      await this.saveOrders(orders);
      await this.touchAgent(id, `${status} ${order.id}`, body.slice(0, 200));
      if (status === "done" && order.claim.length) {
        await this.releaseClaimsFor(id, order.claim);
      }
      return order;
    });
  }

  async askLead(workerId: string, orderId: string, question: string): Promise<{ order: Order; message: InboxMessage }> {
    return this.withLock(async () => {
      const id = canonicalizeAgentId(workerId);
      await this.requireRole(id, "worker");
      const orders = await this.loadOrders();
      const order = orders.orders.find((o) => o.id === orderId);
      if (!order) throw new Error(`Order '${orderId}' not found`);
      order.status = "blocked";
      order.updatedAt = nowIso();
      await this.saveOrders(orders);
      const message = await this.appendInboxUnlocked({
        from: id,
        to: canonicalizeSafe(order.from),
        type: "question",
        re: order.id,
        body: question,
      });
      await this.touchAgent(id, `blocked ${order.id}, asked lead`);
      return { order, message };
    });
  }

  async harvest(leadId: string): Promise<Order[]> {
    return this.withLock(async () => {
      const id = canonicalizeAgentId(leadId);
      await this.requireRole(id, "lead");
      const harvest = await readJson<HarvestFile>(path.join(this.teamDir, "harvest.json"), { cursors: {} });
      const cursor = harvest.cursors[id] ?? harvest.cursors[leadId] ?? "1970-01-01T00:00:00.000Z";
      const orders = await this.loadOrders();
      const fresh = orders.orders.filter(
        (o) =>
          (o.status === "done" || o.status === "blocked") &&
          canonicalizeSafe(o.from) === id &&
          o.updatedAt > cursor,
      );
      harvest.cursors[id] = nowIso();
      for (const key of Object.keys(harvest.cursors)) {
        if (key !== id && canonicalizeSafe(key) === id) {
          delete harvest.cursors[key];
        }
      }
      await writeJson(path.join(this.teamDir, "harvest.json"), harvest);
      await this.touchAgent(id, fresh.length ? `harvested ${fresh.length} result(s)` : "harvest idle");
      return fresh;
    });
  }

  async cancel(leadId: string, orderId: string): Promise<Order> {
    return this.withLock(async () => {
      await this.requireRole(leadId, "lead");
      const orders = await this.loadOrders();
      const order = orders.orders.find((o) => o.id === orderId);
      if (!order) throw new Error(`Order '${orderId}' not found`);
      order.status = "cancelled";
      order.updatedAt = nowIso();
      await this.saveOrders(orders);
      if (order.claim.length) {
        await this.releaseClaimsFor(order.to, order.claim);
      }
      await this.touchAgent(leadId, `cancelled ${order.id}`);
      return order;
    });
  }

  async nudge(leadId: string, workerId: string, body: string): Promise<InboxMessage> {
    return this.withLock(async () => {
      await this.requireRole(leadId, "lead");
      const message = await this.appendInboxUnlocked({
        from: leadId,
        to: workerId,
        type: "handoff",
        re: null,
        body,
      });
      await this.touchAgent(leadId, `nudged ${workerId}`);
      return message;
    });
  }

  async inboxSend(input: {
    from: string;
    to: string;
    type: InboxType;
    re?: string | null;
    body: string;
  }): Promise<InboxMessage> {
    return this.withLock(async () => {
      await this.requireAgent(input.from);
        return this.appendInboxUnlocked({
          from: canonicalizeAgentId(input.from),
          to: input.to === "*" ? "*" : canonicalizeAgentId(input.to),
          type: input.type,
          re: input.re,
          body: input.body,
        });
    });
  }

  async inboxRead(limit = 30): Promise<InboxMessage[]> {
    const raw = await readFile(path.join(this.teamDir, "inbox.jsonl"), "utf8").catch(() => "");
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: InboxMessage[] = [];
    for (const line of lines) {
      try {
        parsed.push(JSON.parse(line) as InboxMessage);
      } catch {
        // skip corrupt line
      }
    }
    return parsed.slice(-limit);
  }

  async publishFinding(input: {
    from: string;
    title: string;
    body: string;
    path?: string;
  }): Promise<InboxMessage> {
    const pointer = input.path ? ` Wrote ${input.path}.` : "";
    return this.inboxSend({
      from: input.from,
      to: "*",
      type: "finding",
      body: `${input.title}: ${input.body}${pointer}`,
    });
  }

  async claimPaths(agentId: string, paths: string[], orderId: string | null, ttlMs = DEFAULT_CLAIM_TTL_MS): Promise<Claim[]> {
    return this.withLock(async () => {
      const agent = await this.requireAgent(agentId);
      return this.upsertClaims(normalizeClaimPaths(paths), agent.id, orderId, ttlMs);
    });
  }

  async releasePaths(agentId: string, paths: string[]): Promise<Claim[]> {
    return this.withLock(async () => {
      const agent = await this.requireAgent(agentId);
      return this.releaseClaimsFor(agent.id, paths);
    });
  }

  async expireClaims(): Promise<Claim[]> {
    return this.withLock(async () => {
      const file = await this.loadClaims();
      const active = this.activeClaims(file.claims);
      file.claims = active;
      await this.saveClaims(file);
      return active;
    });
  }

  private async mergeGitignore(): Promise<void> {
    const gitignore = path.join(this.root, ".gitignore");
    const snippet = ["team/.lock", "team/*.lock", "team/activity.jsonl"];
    let existing = "";
    try {
      existing = await readFile(gitignore, "utf8");
    } catch {
      await writeFile(gitignore, `${snippet.join("\n")}\n`, "utf8");
      return;
    }
    const lines = new Set(existing.split(/\r?\n/));
    const missing = snippet.filter((s) => !lines.has(s));
    if (missing.length) {
      const prefix = existing.endsWith("\n") || existing.length === 0 ? "" : "\n";
      await writeFile(gitignore, `${existing}${prefix}${missing.join("\n")}\n`, "utf8");
    }
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    await mkdir(this.teamDir, { recursive: true });
    await this.ensureLockFile();
    const lockTarget = path.join(this.teamDir, ".lock");
    const release = await lockfile.lock(lockTarget, {
      retries: { retries: 10, factor: 1.3, minTimeout: 20, maxTimeout: 250 },
      stale: 8_000,
    });
    try {
      return await fn();
    } finally {
      await release();
    }
  }

  private async ensureLockFile(): Promise<void> {
    await mkdir(this.teamDir, { recursive: true });
    const lockTarget = path.join(this.teamDir, ".lock");
    try {
      await writeFile(lockTarget, "", { flag: "wx" });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw err;
    }
  }

  private async ensureAgentAllowed(config: TeamConfig, id: string, role: Role): Promise<void> {
    const lead = canonicalizeAgentId(config.leadId);
    if (role === "lead") {
      if (id !== lead) {
        throw new Error(`Lead id must be '${lead}' (got '${id}')`);
      }
      return;
    }
    const workers = config.workers.map((w) => canonicalizeAgentId(w));
    if (workers.includes(id)) {
      if (config.leadId !== lead || config.workers.join(",") !== workers.join(",")) {
        config.leadId = lead;
        config.workers = workers;
        await this.saveConfig(config);
      }
      return;
    }
    const next = nextWorkerId([lead, ...workers]);
    if (id !== next) {
      throw new Error(
        `Worker '${id}' is not next. Next worker is '${next}'. Known: ${[lead, ...workers].join(", ")}`,
      );
    }
    config.leadId = lead;
    config.workers = [...workers, id];
    await this.saveConfig(config);
  }

  private async saveConfig(config: TeamConfig): Promise<void> {
    await writeJson(path.join(this.teamDir, "config.json"), config);
  }

  private async requireAgent(agentId: string): Promise<AgentStatus> {
    const id = canonicalizeAgentId(agentId);
    const status = await this.loadStatus();
    const agent = status.agents[id];
    if (!agent) {
      throw new Error(`Agent '${id}' has not joined. Call team_join first.`);
    }
    return agent;
  }

  async requireRole(agentId: string, role: Role): Promise<AgentStatus> {
    const agent = await this.requireAgent(agentId);
    if (agent.role !== role) {
      throw new Error(`Agent '${agentId}' is ${agent.role}, but this tool requires ${role}`);
    }
    return agent;
  }

  private async touchAgent(agentId: string, doing: string, lastResult?: string): Promise<void> {
    const id = canonicalizeSafe(agentId);
    const status = await this.loadStatus();
    const prev = status.agents[id];
    if (!prev) return;
    prev.doing = doing;
    if (lastResult !== undefined) prev.lastResult = lastResult;
    prev.ts = nowIso();
    status.agents[id] = prev;
    await this.saveStatus(status);
  }

  private async loadStatus(): Promise<StatusFile> {
    const file = await readJson<StatusFile>(path.join(this.teamDir, "status.json"), { agents: {} });
    const agents: Record<string, AgentStatus> = {};
    for (const [key, value] of Object.entries(file.agents)) {
      const id = canonicalizeSafe(key);
      agents[id] = { ...value, id };
    }
    return { agents };
  }

  private async saveStatus(file: StatusFile): Promise<void> {
    await writeJson(path.join(this.teamDir, "status.json"), file);
  }

  private async loadOrders(): Promise<OrdersFile> {
    return readJson<OrdersFile>(path.join(this.teamDir, "orders.json"), { orders: [] });
  }

  private async saveOrders(file: OrdersFile): Promise<void> {
    const doneNewest = new Set(
      file.orders
        .filter((o) => o.status === "done")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, KEEP_DONE_ORDERS)
        .map((o) => o.id),
    );
    file.orders = file.orders.filter((o) => o.status !== "done" || doneNewest.has(o.id));
    for (const order of file.orders) {
      order.resultBody = capResultBody(order.resultBody);
    }
    await writeJson(path.join(this.teamDir, "orders.json"), file);
  }

  private async loadClaims(): Promise<ClaimsFile> {
    const value = await readJson<ClaimsFile>(path.join(this.teamDir, "claims.json"), { claims: [] });
    return Array.isArray(value.claims) ? value : { claims: [] };
  }

  private async saveClaims(file: ClaimsFile): Promise<void> {
    await writeJson(path.join(this.teamDir, "claims.json"), file);
  }

  private activeClaims(claims: Claim[]): Claim[] {
    const now = Date.now();
    return claims.filter((c) => Date.parse(c.expiresAt) > now);
  }

  private async upsertClaims(
    paths: string[],
    owner: string,
    orderId: string | null,
    ttlMs = DEFAULT_CLAIM_TTL_MS,
  ): Promise<Claim[]> {
    const file = await this.loadClaims();
    const active = this.activeClaims(file.claims);
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    for (const p of paths) {
      const normalized = normalizeClaimPath(p);
      const conflict = active.find((c) => c.path === normalized && c.owner !== owner);
      if (conflict) {
        throw new Error(`Path '${normalized}' is claimed by '${conflict.owner}' until ${conflict.expiresAt}`);
      }
      const existing = active.find((c) => c.path === normalized && c.owner === owner);
      if (existing) {
        existing.expiresAt = expiresAt;
        existing.orderId = orderId;
      } else {
        active.push({ path: normalized, owner, orderId, expiresAt });
      }
    }
    file.claims = active;
    await this.saveClaims(file);
    return active.filter((c) => c.owner === owner);
  }

  private async releaseClaimsFor(owner: string, paths: string[]): Promise<Claim[]> {
    const file = await this.loadClaims();
    const set = new Set(paths.map((p) => p.replaceAll("\\", "/")));
    file.claims = this.activeClaims(file.claims).filter((c) => !(c.owner === owner && set.has(c.path)));
    await this.saveClaims(file);
    return file.claims;
  }

  private async appendInboxUnlocked(input: {
    from: string;
    to: string;
    type: InboxType;
    re?: string | null;
    body: string;
  }): Promise<InboxMessage> {
    const body = input.body.replaceAll("\0", "");
    if (body.length > INBOX_MAX_BODY_CHARS) {
      throw new Error(`Inbox body exceeds ${INBOX_MAX_BODY_CHARS} characters`);
    }
    const message: InboxMessage = {
      id: shortId("m"),
      ts: nowIso(),
      from: input.from,
      to: input.to,
      type: input.type,
      re: input.re ?? null,
      body,
    };
    await appendFile(path.join(this.teamDir, "inbox.jsonl"), `${JSON.stringify(message)}\n`, "utf8");
    await this.rotateInboxUnlocked();
    return message;
  }

  private async rotateInboxUnlocked(keep = INBOX_KEEP_LINES): Promise<void> {
    const inboxPath = path.join(this.teamDir, "inbox.jsonl");
    const raw = await readFile(inboxPath, "utf8");
    const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
    if (lines.length <= keep) return;
    await writeFile(inboxPath, `${lines.slice(-keep).join("\n")}\n`, "utf8");
  }
}
