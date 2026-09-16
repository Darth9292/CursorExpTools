import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { canonicalizeAgentId } from "./ids.js";
function parseSectionHeading(line) {
    const agent = line.match(/^#{1,3}\s+Agent\s+([A-Za-z]|[1-9]\d*)\s*(?:[-–—:]\s*(.+))?\s*$/i);
    if (agent) {
        return { id: canonicalizeAgentId(agent[1]), headerTitle: agent[2]?.trim() ?? "" };
    }
    const worker = line.match(/^#{1,3}\s+Worker\s+([A-Za-z]|[1-9]\d*)\s*(?:[-–—:]\s*(.+))?\s*$/i);
    if (worker) {
        return { id: canonicalizeAgentId(worker[1]), headerTitle: worker[2]?.trim() ?? "" };
    }
    const plain = line.match(/^#{1,3}\s+([A-Za-z]|[1-9]\d*)\s*(?:[-–—:]\s*(.+))?\s*$/);
    if (plain) {
        return { id: canonicalizeAgentId(plain[1]), headerTitle: plain[2]?.trim() ?? "" };
    }
    return null;
}
const INLINE_WORKER = /^(?:[-*]\s+)?(?:\*\*)?(?:Agent\s+|Worker\s+)?([A-Za-z]|[1-9]\d*)(?:\*\*)?\s*[-–—:]\s*(.+)$/;
export function findAgentsMdPath(workspaceRoot) {
    for (const name of ["AGENTS.md", "agents.md", "Agents.md"]) {
        const file = path.join(workspaceRoot, name);
        if (existsSync(file))
            return file;
    }
    return null;
}
export function readAgentsMd(workspaceRoot) {
    const file = findAgentsMdPath(workspaceRoot);
    if (!file)
        return null;
    try {
        return readFileSync(file, "utf8");
    }
    catch {
        return null;
    }
}
function extractPersonaFromBody(headerTitle, bodyLines) {
    const body = bodyLines.join("\n");
    const titleFromBody = body.match(/^\s*[-*]?\s*\*\*Title:\*\*\s*(.+)$/im)?.[1]?.trim();
    const focusFromBody = body.match(/^\s*[-*]?\s*\*\*Focus:\*\*\s*(.+)$/im)?.[1]?.trim();
    if (titleFromBody && focusFromBody) {
        return { title: titleFromBody, focus: focusFromBody };
    }
    const trimmed = bodyLines.map((l) => l.trim()).filter(Boolean);
    const title = headerTitle || trimmed[0]?.replace(/^[-*]\s+/, "") || "Specialist";
    const focus = focusFromBody ||
        trimmed.slice(headerTitle ? 0 : 1).join(" ").slice(0, 800) ||
        "Follow AGENTS.md for this role.";
    return { title: title.slice(0, 120), focus };
}
/** Best-effort parse of AGENTS.md worker sections (### B, ## Agent C — title, bullets). */
export function parseAgentsMarkdown(content, workerIds) {
    const wanted = new Set(workerIds.map((w) => canonicalizeAgentId(w)));
    const workers = {};
    const lines = content.split(/\r?\n/);
    let domain = "";
    let summary = "";
    const firstH1 = lines.find((l) => /^#\s+/.test(l));
    if (firstH1) {
        domain = firstH1.replace(/^#\s+/, "").trim();
    }
    const intro = [];
    for (const line of lines) {
        if (/^#{1,3}\s+/.test(line))
            break;
        if (line.trim() && !line.startsWith("<!--"))
            intro.push(line.trim());
    }
    summary = intro.join(" ").slice(0, 500);
    for (const line of lines) {
        const inline = line.match(INLINE_WORKER);
        if (inline) {
            const id = canonicalizeAgentId(inline[1]);
            if (wanted.has(id) && !workers[id]) {
                const rest = inline[2].trim();
                const dash = rest.search(/\s[-–—]\s/);
                if (dash > 0) {
                    workers[id] = {
                        title: rest.slice(0, dash).trim(),
                        focus: rest.slice(dash).replace(/^\s[-–—]\s*/, "").trim(),
                    };
                }
                else {
                    workers[id] = { title: rest.slice(0, 80), focus: rest };
                }
            }
        }
    }
    for (let i = 0; i < lines.length; i++) {
        const head = parseSectionHeading(lines[i]);
        if (head) {
            const id = head.id;
            if (!wanted.has(id)) {
                i++;
                continue;
            }
            const body = [];
            i++;
            while (i < lines.length && !/^#{1,3}\s+/.test(lines[i])) {
                body.push(lines[i]);
                i++;
            }
            workers[id] = extractPersonaFromBody(head.headerTitle, body);
            i--;
            continue;
        }
    }
    return { domain, summary, workers };
}
/** Chat overrides win per worker id; then AGENTS.md; then defaults. */
export function mergeWorkerPersonas(workerIds, fromAgentsMd, chatOverrides, defaults) {
    const out = {};
    for (const w of workerIds) {
        const id = canonicalizeAgentId(w);
        const override = chatOverrides?.[id] ??
            chatOverrides?.[id.toLowerCase()] ??
            chatOverrides?.[w];
        out[id] = override ?? fromAgentsMd[id] ?? defaults[id];
    }
    return out;
}
export function normalizeOverrideWorkers(raw) {
    if (!raw)
        return undefined;
    const out = {};
    for (const [key, val] of Object.entries(raw)) {
        if (!val?.title || !val?.focus)
            continue;
        out[canonicalizeAgentId(key)] = {
            title: String(val.title).trim(),
            focus: String(val.focus).trim(),
        };
    }
    return Object.keys(out).length ? out : undefined;
}
//# sourceMappingURL=agents-md.js.map