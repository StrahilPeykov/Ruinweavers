import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

test("personal replay seed, synchronized readiness and bounded room cleanup", async ({
  browser,
}) => {
  const a = await browser.newPage(),
    b = await browser.newPage();
  const samples: any[] = [];
  try {
    for (const p of [a, b]) {
      await p.goto(
        `/?scene=run&seed=1987&quality=${process.env.RUIN_RUN_QUALITY ?? "lightweight"}`,
      );
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
    let original: any;
    for (let i = 0; i < 4; i++) {
      // Lifecycle fixture only: actual full normal-health combat is in run.spec.
      const offers = await a.evaluate(async () => {
        const api = window.__RUINWEAVERS__;
        api.setPaused(true);
        api.setupTestState({
          entities: api
            .getState()
            .entities.filter((e: any) => e.ai)
            .map((e: any) => ({ id: e.id, hp: 0 })),
        });
        api.setPaused(false);
      });
      await b.waitForFunction(
        () => !!window.__RUINWEAVERS__.getState().run.reward,
      );
      const state = await b.evaluate(() => window.__RUINWEAVERS__.getState());
      if (i === 0) original = state.run.reward.offers;
      else if (i < 3) expect(state.run.reward.offers).toEqual(original);
      for (const p of [a, b])
        await p.locator("#reward-cards button").first().click();
      for (const p of [a, b]) await p.locator("#trial-action").click();
      await a.waitForFunction(
        () => window.__RUINWEAVERS__.getState().trial.status === "active",
      );
      await a.evaluate(() => {
        const api = window.__RUINWEAVERS__;
        api.setPaused(true);
        api.setupTestState({
          entities: [
            { id: "mage-1", hp: 0 },
            { id: "mage-2", hp: 0 },
          ],
        });
        api.setPaused(false);
      });
      await b.waitForFunction(
        () => window.__RUINWEAVERS__.getState().trial.status === "defeat",
      );
      const before = await b.evaluate(() => ({
        seed: window.__RUINWEAVERS__.getState().seed,
        id: window.__RUINWEAVERS__.getState().run.id,
      }));
      await b.locator(i === 2 ? "#trial-action" : "#retry-seed").click();
      await a.waitForFunction(
        (id) => window.__RUINWEAVERS__.getState().run.id !== id,
        before.id,
      );
      const pending = await a.evaluate(() => window.__RUINWEAVERS__.getState());
      expect(pending.trial.status).toBe("ready");
      expect(pending.party.ready).toEqual(["mage-2"]);
      if (i !== 2) expect(pending.seed).toBe(before.seed);
      await a.locator("#trial-action").click();
      await b.waitForFunction(
        () => window.__RUINWEAVERS__.getState().trial.status === "active",
      );
      expect(
        await b.evaluate(() => window.__RUINWEAVERS__.getState().seed),
      ).toBe(pending.seed);
      expect(
        await b.evaluate(() => window.__RUINWEAVERS__.getState().run.upgrades),
      ).toEqual({ "mage-1": [], "mage-2": [] });
      await b.waitForTimeout(150);
      samples.push(
        await b.evaluate(() => {
          const m = window.__RUINWEAVERS__.getMetrics().render;
          return {
            geometries: m.geometries,
            textures: m.textures,
            drawCalls: m.drawCalls,
            art: m.art.active,
          };
        }),
      );
    }
    expect(new Set(samples.map((s) => s.textures)).size).toBe(1);
    expect(
      Math.max(...samples.map((s) => s.geometries)) -
        Math.min(...samples.map((s) => s.geometries)),
    ).toBeLessThanOrEqual(2);
    const dir = `test-results/replay-${Date.now()}`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/resources.json`, JSON.stringify(samples, null, 2));
  } finally {
    await a.close();
    await b.close();
  }
});
