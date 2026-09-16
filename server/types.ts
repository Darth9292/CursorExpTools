export const DEFAULT_PORT = 7391;
export const DEFAULT_CLAIM_TTL_MS = 30 * 60 * 1000;
export const DEFAULT_LEAD_ID = "A";
export const DEFAULT_WORKER_ID = "B";

export type Role = "lead" | "worker";
export type OrderMode = "parallel" | "assist" | "handoff";
export type OrderStatus = "open" | "claimed" | "done" | "blocked" | "cancelled";
export type InboxType = "finding" | "question" | "answer" | "handoff" | "blocked";

export interface TeamConfig {
  enabled: boolean;
  port: number;
  leadId: string;
  workers: string[];
  workspaceRoot?: string;
}

export interface AgentStatus {
  id: string;
  role: Role;
  doing: string;
  lastResult: string;
  ts: string;
}

export interface Order {
  id: string;
  from: string;
  to: string;
  mode: OrderMode;
  status: OrderStatus;
  title: string;
  brief: string;
  claim: string[];
  doneWhen: string;
  resultPath: string | null;
  resultBody: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InboxMessage {
  id: string;
  ts: string;
  from: string;
  to: string;
  type: InboxType;
  re: string | null;
  body: string;
}

export interface Claim {
  path: string;
  owner: string;
  orderId: string | null;
  expiresAt: string;
}

export interface StatusFile {
  agents: Record<string, AgentStatus>;
}

export interface OrdersFile {
  orders: Order[];
}

export interface ClaimsFile {
  claims: Claim[];
}

export interface HarvestFile {
  cursors: Record<string, string>;
}

export const DEFAULT_CONFIG: TeamConfig = {
  enabled: true,
  port: DEFAULT_PORT,
  leadId: DEFAULT_LEAD_ID,
  workers: [DEFAULT_WORKER_ID],
};
