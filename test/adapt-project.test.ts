import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { adaptProject } from "../server/adapt-project.js";
import { readProjectProfile } from "../server/project-profile.js";
import { TeamStore } from "../server/store.js";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe("adaptProject", () => {
  it("uses AGENTS.md then chat overrides", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "adapt-"));
    dirs.push(dir);
    const store = new TeamStore(dir);
    await store.scaffold();
    await writeFile(
      path.join(dir, "AGENTS.md"),
      `# RE repo\n\nFirmware stuff.\n\n## Agent B\n\n- **Title:** From file\n- **Focus:** From AGENTS\n`,
    );
    await store.join("A", "lead", "lead");
    const result = await adaptProject(store, "A", {
      workers: { B: { title: "Chat lead", focus: "User wins" } },
    });
    expect(result.mergedFrom).toContain("AGENTS.md");
    expect(result.mergedFrom).toContain("chat overrides");
    const profile = readProjectProfile(dir);
    expect(profile?.workers.B).toEqual({ title: "Chat lead", focus: "User wins" });
    const md = await readFile(path.join(dir, "knowledge", "project.md"), "utf8");
    expect(md).toContain("Chat lead");
  });
});
