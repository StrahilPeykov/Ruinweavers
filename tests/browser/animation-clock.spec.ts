import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

test("guest cosmetic gait advances between snapshots for both displayed mages", async ({
  browser,
}) => {
  test.setTimeout(90000);
  const a = await browser.newPage(),
    b = await browser.newPage();
  const evidence: any[] = [];
  try {
    for (const p of [a, b]) {
      await p.goto("/?scene=trial/mixed&art=illustrated&quality=lightweight");
      await p.waitForFunction(() => !!window.__RUINWEAVERS__);
      await p.getByText("Connection options", { exact: true }).click();
      await p.locator("#signaling").selectOption("local");
    }
    await a.getByRole("button", { name: "Create co-op", exact: true }).click();
    await b
      .locator("#room-code")
      .fill(await a.locator("#room-code").inputValue());
    await b.getByRole("button", { name: "Join co-op", exact: true }).click();
    await b.waitForFunction(
      () => window.__RUINWEAVERS__.getNetworkState().status === "connected",
    );
    for (const p of [a, b])
      await p.getByRole("button", { name: "Ready", exact: true }).click();
    for (const jitter of [0, 30]) {
      await a.evaluate(() => {
        const api = window.__RUINWEAVERS__;
        api.setPaused(true);
        api.setupTestState({
          enemyEnabled: false,
          entities: [
            { id: "mage-1", pos: { x: -4, y: 0.75, z: 6 } },
            { id: "mage-2", pos: { x: 3, y: 0.75, z: 6 } },
          ],
        });
        api.setPaused(false);
      });
      const epoch = await a.evaluate(
        () => window.__RUINWEAVERS__.getState().party.epoch,
      );
      for (const p of [a, b]) {
        await p.waitForFunction(
          (e) => window.__RUINWEAVERS__.getNetworkState().epoch === e,
          epoch,
        );
        await p.evaluate(
          (j) =>
            window.__RUINWEAVERS__.setNetworkProfile({
              delayMs: j ? 80 : 0,
              jitterMs: j,
              seed: 19,
            }),
          jitter,
        );
      }
      await a.keyboard.down("w");
      await b.keyboard.down("w");
      const frames = await b.evaluate(async () => {
        const frames: any[] = [];
        for (let i = 0; i < 70; i++) {
          await new Promise(requestAnimationFrame);
          const api = window.__RUINWEAVERS__;
          frames.push({
            tick: api.getState().tick,
            time: api.getState().time,
            poses: api.getMetrics().render.performances,
          });
        }
        return frames;
      });
      await a.keyboard.up("w");
      await b.keyboard.up("w");
      evidence.push({ jitter, frames });
      for (const id of ["mage-1", "mage-2"]) {
        const changes = frames
          .slice(1)
          .filter(
            (f, i) =>
              f.tick === frames[i].tick &&
              JSON.stringify(
                f.poses.find((p: any) => p.id === id)?.pose?.stride,
              ) !==
                JSON.stringify(
                  frames[i].poses.find((p: any) => p.id === id)?.pose,
                ),
          );
        expect(
          changes.length,
          `${id} continuous pose at jitter ${jitter}`,
        ).toBeGreaterThan(3);
      }
    }
  } finally {
    const dir = `test-results/animation-${Date.now()}`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/frames.json`, JSON.stringify(evidence));
    await a.close();
    await b.close();
  }
});
