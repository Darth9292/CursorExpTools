import { describe, expect, it } from "vitest";
import {
  enrichDelegateBrief,
  personaForWorker,
  readProjectProfile,
} from "../server/project-profile.js";

describe("project-profile", () => {
  const profile = {
    domain: "DayZ modding",
    summary: "Enfusion scripts and server configs.",
    workers: {
      B: { title: "Gameplay scripter", focus: "CF / mission systems" },
      C: { title: "Asset pipeline", focus: "PBO and models" },
    },
    sources: ["README.md"],
    adaptedAt: "2026-09-15T00:00:00.000Z",
  };

  it("enriches delegate brief with context and persona", () => {
    const out = enrichDelegateBrief(profile, "B", "Fix trader UI bug.");
    expect(out).toContain("Fix trader UI bug");
    expect(out).toContain("DayZ modding");
    expect(out).toContain("Gameplay scripter");
    expect(out).toContain("Layering");
  });

  it("returns the raw brief when profile is null", () => {
    expect(enrichDelegateBrief(null, "B", "Only this.")).toBe("Only this.");
  });

  it("adds project context without persona when worker is unknown", () => {
    const out = enrichDelegateBrief(profile, "D", "Ship docs.");
    expect(out.startsWith("Ship docs.")).toBe(true);
    expect(out).toContain("DayZ modding");
    expect(out).not.toContain("Your role");
    expect(out).toContain("Layering");
  });

  it("resolves persona by worker id", () => {
    expect(personaForWorker(profile, "c")?.title).toBe("Asset pipeline");
    expect(personaForWorker(profile, "Z")).toBeNull();
  });

  it("readProjectProfile returns null when missing", () => {
    expect(readProjectProfile("E:\\nonexistent-path-xyz")).toBeNull();
  });
});
