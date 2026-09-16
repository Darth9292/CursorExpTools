import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  findAgentsMdPath,
  mergeWorkerPersonas,
  normalizeOverrideWorkers,
  parseAgentsMarkdown,
  readAgentsMd,
} from "./agents-md.js";
import {
  DEFAULT_LAYERING_NOTE,
  type ProjectProfile,
  PROJECT_MARKDOWN_PATH,
  PROJECT_PROFILE_PATH,
  renderProjectMarkdown,
} from "./project-profile.js";
import { defaultWorkersFromConfig, type WorkerPersona } from "./project-profile.js";
import type { TeamStore } from "./store.js";

export interface AdaptProjectInput {
  domain?: string;
  summary?: string;
  workers?: Record<string, { title: string; focus: string }>;
}

export interface AdaptProjectResult {
  profile: ProjectProfile;
  mergedFrom: string[];
  written: string[];
}

export async function adaptProject(
  store: TeamStore,
  agentId: string,
  input: AdaptProjectInput = {},
): Promise<AdaptProjectResult> {
  const config = await store.requireEnabled();
  await store.requireRole(agentId, "lead");

  const workerIds = config.workers.length > 0 ? config.workers : ["B"];
  const defaults = defaultWorkersFromConfig(config);
  const mergedFrom: string[] = [];

  let domain = input.domain?.trim() ?? "";
  let summary = input.summary?.trim() ?? "";
  let fromAgents: Record<string, WorkerPersona> = {};

  const agentsText = readAgentsMd(store.root);
  const agentsPath = findAgentsMdPath(store.root);
  if (agentsText) {
    const parsed = parseAgentsMarkdown(agentsText, workerIds);
    fromAgents = parsed.workers;
    if (!domain && parsed.domain) domain = parsed.domain;
    if (!summary && parsed.summary) summary = parsed.summary;
    mergedFrom.push(agentsPath ? path.basename(agentsPath) : "AGENTS.md");
  }

  const chatOverrides = normalizeOverrideWorkers(input.workers);
  if (chatOverrides) {
    mergedFrom.push("chat overrides");
  }

  const workers = mergeWorkerPersonas(workerIds, fromAgents, chatOverrides, defaults);

  const profile: ProjectProfile = {
    domain,
    summary,
    workers,
    sources: [
      ...(agentsPath ? [path.basename(agentsPath)] : []),
      ...(chatOverrides ? ["user chat overrides"] : []),
    ],
    adaptedAt: new Date().toISOString(),
    layeringNote: DEFAULT_LAYERING_NOTE,
  };

  const projectJson = path.join(store.root, PROJECT_PROFILE_PATH);
  const projectMd = path.join(store.root, PROJECT_MARKDOWN_PATH);
  await writeFile(projectJson, `${JSON.stringify(profile, null, 2)}\n`, "utf8");
  await writeFile(projectMd, renderProjectMarkdown(profile), "utf8");

  await store.heartbeat(agentId, `adapted project (${mergedFrom.join(", ") || "defaults"})`);

  return {
    profile,
    mergedFrom,
    written: [PROJECT_PROFILE_PATH, PROJECT_MARKDOWN_PATH],
  };
}
