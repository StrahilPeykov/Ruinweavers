import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const out =
  process.env.RUIN_WALL_OUTPUT ??
  `artifacts/spatial-0.3/raw/walls-${Date.now()}`;
for (const quality of ["lightweight", "standard"])
  test(`wall trim during camera-follow movement: ${quality}`, async ({
    page,
  }) => {
    mkdirSync(out, { recursive: true });
    const evidence = [];
    for (const room of ["split", "rotunda"]) {
      await page.goto(
        `/?scene=trial/mixed&room=${room}&art=illustrated&quality=${quality}&seed=123`,
      );
      await page.waitForFunction(
        () => window.__RUINWEAVERS__?.getMetrics().render.art.active,
      );
      await page.locator("#trial-action").click();
      const before = await page.evaluate(
        () => window.__RUINWEAVERS__.getPlayerState().pos,
      );
      await page.keyboard.down("w");
      for (let i = 0; i < 3; i++) {
        await page.waitForTimeout(350);
        await page.screenshot({ path: `${out}/${quality}-${room}-${i}.png` });
      }
      await page.keyboard.up("w");
      const after = await page.evaluate(() => ({
        pos: window.__RUINWEAVERS__.getPlayerState().pos,
        build: window.__RUINWEAVERS__.getNetworkState().build,
        render: window.__RUINWEAVERS__.getMetrics().render,
      }));
      expect(before.z - after.pos.z).toBeGreaterThan(2);
      expect(after.render.contextLost).toBe(false);
      evidence.push({ room, quality, before, ...after });
    }
    writeFileSync(`${out}/${quality}.json`, JSON.stringify(evidence));
  });
