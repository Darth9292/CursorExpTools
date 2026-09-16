import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveWorkspaceRoot } from "../server/workspace.js";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe("resolveWorkspaceRoot", () => {
  it("prefers an explicit path", () => {
    expect(resolveWorkspaceRoot("E:\\proj", "C:\\other", ["C:\\known"])).toBe(path.resolve("E:\\proj"));
  });

  it("uses cwd when team/config.json exists", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "agent-team-root-"));
    dirs.push(dir);
    await mkdir(path.join(dir, "team"));
    await writeFile(path.join(dir, "team", "config.json"), "{}\n");
    expect(resolveWorkspaceRoot(undefined, dir, [])).toBe(path.resolve(dir));
  });

  it("falls back to the only known workspace", () => {
    expect(resolveWorkspaceRoot(undefined, os.tmpdir(), ["E:\\only"])).toBe("E:\\only");
  });

  it("throws instead of asking a human for a paste", () => {
    expect(() => resolveWorkspaceRoot(undefined, os.tmpdir(), [])).toThrow(/Never ask the human/);
  });
});
