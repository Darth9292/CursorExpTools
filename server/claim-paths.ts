/** Normalize and validate repo-relative claim paths (no traversal or absolutes). */
export function normalizeClaimPath(raw: string): string {
  const p = String(raw ?? "").trim().replaceAll("\\", "/");
  if (!p) throw new Error("Claim path is empty");
  if (p.startsWith("/") || /^[A-Za-z]:/.test(p)) {
    throw new Error(`Claim path must be relative: ${raw}`);
  }
  const segments = p.split("/").filter((s) => s.length > 0);
  if (segments.some((s) => s === "..")) {
    throw new Error(`Claim path must not contain '..': ${raw}`);
  }
  return segments.join("/");
}

export function normalizeClaimPaths(paths: string[]): string[] {
  return paths.map(normalizeClaimPath);
}
