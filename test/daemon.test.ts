import { afterEach, describe, expect, it } from "vitest";
import { startDaemon } from "../server/daemon.js";
import { ensureDaemon } from "../server/ensure-daemon.js";

const PORT = 17391;

describe("HTTP daemon", () => {
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (close) {
      await close().catch(() => undefined);
      close = undefined;
    }
  });

  it("serves /health and is reused by ensureDaemon", async () => {
    const started = await startDaemon(PORT);
    close = started.close;
    const res = await fetch(`http://127.0.0.1:${PORT}/health`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as {
      ok: boolean;
      name: string;
      port: number;
      buildId: number;
      startedAt: string;
    };
    expect(body.ok).toBe(true);
    expect(body.name).toBe("cursor-agent-team");
    expect(body.port).toBe(PORT);
    expect(typeof body.buildId).toBe("number");
    expect(body.startedAt).toMatch(/^\d{4}-/);

    const ensured = await ensureDaemon(PORT, 1000);
    expect(ensured.ok).toBe(true);
    expect(ensured.started).toBe(false);
    expect(ensured.hint).toContain("kill the process on this port then ensure:bus to load new dist");
  });
});
