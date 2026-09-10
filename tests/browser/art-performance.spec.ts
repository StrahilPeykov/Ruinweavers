import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
// Run this separately, without video recording/encoding or another browser suite.
for (const art of ["off", "storybook", "ink"])
  test(`isolated render sample: ${art}`, async ({ browser }) => {
    test.setTimeout(90000);
    const ca = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      }),
      cb = await browser.newContext({ viewport: { width: 1440, height: 900 } }),
      a = await ca.newPage(),
      b = await cb.newPage();
    try {
      for (const p of [a, b]) {
        await p.goto(`/?scene=trial/mixed&art=${art}&quality=lightweight`);
        await p.waitForFunction(() => !!window.__RUINWEAVERS__);
        await p.getByText("Connection options", { exact: true }).click();
        await p.locator("#signaling").selectOption("local");
      }
      await a.locator("#create-room").click();
      await b
        .locator("#room-code")
        .fill(await a.locator("#room-code").inputValue());
      await b.keyboard.press("Enter");
      await b.waitForFunction(
        () => window.__RUINWEAVERS__.getNetworkState().status === "connected",
      );
      for (const p of [a, b]) await p.locator("#trial-action").click();
      await b.waitForFunction(
        () => window.__RUINWEAVERS__.getState().trial.status === "active",
      );
      for (const p of [a, b]) {
        expect(
          await p.evaluate(
            () => window.__RUINWEAVERS__.getState().trial.encounter,
          ),
        ).toBe(2);
        expect(
          await p.evaluate(
            () => window.__RUINWEAVERS__.getMetrics().render.art.active,
          ),
        ).toBe(art !== "off");
      }
      const epoch = await a.evaluate(() => {
        const api = window.__RUINWEAVERS__;
        api.setPaused(true);
        api.setupTestState({
          enemyEnabled: false,
          entities: [
            { id: "mage-1", pos: { x: -2, y: 0.75, z: 5 } },
            { id: "mage-2", pos: { x: 2, y: 0.75, z: 5 } },
          ],
        });
        api.setPaused(false);
        return api.getState().party.epoch;
      });
      await b.waitForFunction(
        (e) => window.__RUINWEAVERS__.getState().party.epoch === e,
        epoch,
      );
      await b.waitForTimeout(700);
      for (const [i, p] of [a, b].entries()) {
        await p.keyboard.press(i ? "3" : "2");
        const xy = await p.evaluate(
          (pos) => window.__RUINWEAVERS__.projectWorld(pos),
          { x: i ? 2 : -2, y: 0, z: 1 },
        );
        await p.mouse.move(xy.x, xy.y);
        await p.keyboard.press("f");
      }
      await a.waitForFunction(
        () => window.__RUINWEAVERS__.getState().fields.length === 2,
      );
      for (const [i, p] of [a, b].entries()) {
        await p.keyboard.press(i ? "4" : "1");
        const xy = await p.evaluate(
          (pos) => window.__RUINWEAVERS__.projectWorld(pos),
          { x: 0, y: 0, z: i ? 0 : -6 },
        );
        await p.mouse.move(xy.x, xy.y);
        await p.keyboard.down("j");
      }
      await a.waitForTimeout(1200);
      const samples = await Promise.all(
        [a, b].map((p) =>
          p.evaluate(
            () =>
              new Promise<any>((resolve) => {
                const intervals: number[] = [];
                let previous = performance.now();
                const frame = (now: number) => {
                  intervals.push(now - previous);
                  previous = now;
                  if (intervals.length < 60) {
                    requestAnimationFrame(frame);
                    return;
                  }
                  const sorted = [...intervals].sort((a, b) => a - b),
                    api = window.__RUINWEAVERS__;
                  resolve({
                    build: api.getNetworkState().build,
                    role: api.getNetworkState().role,
                    render: api.getMetrics().render,
                    frameSample: {
                      count: intervals.length,
                      mean:
                        intervals.reduce((a, b) => a + b, 0) / intervals.length,
                      p50: sorted[30],
                      p95: sorted[57],
                      max: sorted[59],
                    },
                    fields: api.getState().fields.length,
                    casts: api.getMetrics().casts,
                  });
                };
                requestAnimationFrame(frame);
              }),
          ),
        ),
      );
      for (const p of [a, b]) await p.keyboard.up("j");
      expect(samples[0].fields).toBe(2);
      mkdirSync("artifacts/art-proof/performance", { recursive: true });
      writeFileSync(
        `artifacts/art-proof/performance/${art}.json`,
        JSON.stringify(
          {
            conditions:
              "Two same-machine WebRTC browsers; four existing enemies with AI disabled for repeatability; two real fields and held Ember/Stone casting; 60 requestAnimationFrame intervals per client; no video/encoding; software renderer is reported, not hardware GPU extrapolation.",
            samples,
          },
          null,
          2,
        ),
      );
    } finally {
      await ca.close();
      await cb.close();
    }
  });
