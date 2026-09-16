import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("adapt-cli", () => {
  it("is built to dist/adapt-cli.js", () => {
    const file = path.join(import.meta.dirname, "../dist/adapt-cli.js");
    expect(existsSync(file)).toBe(true);
  });
});
