const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
/** Canonical ids: A (lead), B-Z, then 1, 2, 3... Aliases: a, lead-a, agent-B, etc. */
export function canonicalizeAgentId(raw) {
    const s = raw.trim();
    if (!s)
        throw new Error("Agent id is empty. Use A-Z, then 1, 2, 3...");
    const named = s.match(/^(?:lead|agent|worker)[-_]?([A-Za-z])$/i);
    if (named?.[1])
        return named[1].toUpperCase();
    if (/^[A-Za-z]$/.test(s))
        return s.toUpperCase();
    if (/^[1-9]\d*$/.test(s))
        return s;
    throw new Error(`Invalid agent id '${raw}'. Agents are A-Z, then 1, 2, 3...`);
}
export function nextWorkerId(taken) {
    const used = new Set();
    for (const t of taken) {
        try {
            used.add(canonicalizeAgentId(t));
        }
        catch {
            used.add(t.trim().toUpperCase());
        }
    }
    for (const letter of LETTERS.slice(1)) {
        if (!used.has(letter))
            return letter;
    }
    for (let n = 1; n < 10_000; n++) {
        const id = String(n);
        if (!used.has(id))
            return id;
    }
    throw new Error("No free worker ids");
}
export function takenIds(config) {
    return [config.leadId, ...config.workers];
}
//# sourceMappingURL=ids.js.map