import { canonicalizeAgentId } from "./ids.js";
import type { ProjectProfile, WorkerPersona } from "./project-profile.js";
import { normalizeClaimPath } from "./claim-paths.js";

export interface SuggestWorkerInput {
  claim?: string[];
  hint?: string;
  workerIds: string[];
  profile: ProjectProfile | null;
}

export interface WorkerSuggestion {
  id: string;
  score: number;
  title: string;
  focus: string;
  reasons: string[];
}

const PATH_HINTS: Record<string, RegExp[]> = {
  B: [/^(server|hooks|dist|scripts)\//, /server\/mcp-tools/, /store\.ts/, /daemon/, /watch-orders/],
  C: [/^(skills|commands|rules|agents|knowledge)\//, /^README/i, /CHANGELOG/, /order-templates/],
  D: [/^test\/SMOKE/, /link-local/, /pack/, /marketplace/, /bloat\.md/, /^\.gitignore$/],
  E: [/^test\//, /\.test\.ts$/, /vitest/, /smoke:check/],
  F: [/security/, /inbox/, /claim-paths/],
  G: [/wave-\d+/, /brainstorm/, /backlog/, /synthesis/],
};

function personaFor(profile: ProjectProfile | null, id: string): WorkerPersona {
  const p = profile?.workers?.[id];
  return p ?? { title: `Specialist ${id}`, focus: "" };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

export function suggestWorkers(input: SuggestWorkerInput): WorkerSuggestion[] {
  const claims = (input.claim ?? []).map((p) => normalizeClaimPath(p));
  const hint = (input.hint ?? "").trim();
  const corpus = `${claims.join(" ")} ${hint}`.toLowerCase();
  const hintTokens = new Set(tokenize(corpus));

  const out: WorkerSuggestion[] = [];

  for (const rawId of input.workerIds) {
    const id = canonicalizeAgentId(rawId);
    const persona = personaFor(input.profile, id);
    const reasons: string[] = [];
    let score = 0;

    for (const re of PATH_HINTS[id] ?? []) {
      if (claims.some((c) => re.test(c)) || re.test(corpus)) {
        score += 3;
        reasons.push(`path matches ${re}`);
      }
    }

    const focusTokens = tokenize(`${persona.title} ${persona.focus}`);
    for (const t of focusTokens) {
      if (hintTokens.has(t)) {
        score += 1;
        if (reasons.length < 4) reasons.push(`focus keyword "${t}"`);
      }
    }

    out.push({ id, score, title: persona.title, focus: persona.focus, reasons });
  }

  out.sort((a, b) => b.score - a.score);
  return out;
}

export function topWorkerSuggestion(suggestions: WorkerSuggestion[]): WorkerSuggestion | null {
  const top = suggestions[0];
  if (!top || top.score <= 0) return null;
  if (suggestions[1] && suggestions[1].score === top.score) return null;
  return top;
}
