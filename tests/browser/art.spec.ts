import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const dir = "artifacts/art-proof";
mkdirSync(dir, { recursive: true });
async function capture(p: Page, name: string) {
  await p.screenshot({ path: `${dir}/${name}.png` });
  const data = await p.evaluate(() => ({
    build: window.__RUINWEAVERS__.getNetworkState().build,
    config: window.__RUINWEAVERS__.getExperimentConfig(),
    state: window.__RUINWEAVERS__.getState(),
    metrics: window.__RUINWEAVERS__.getMetrics(),
  }));
  writeFileSync(`${dir}/${name}.json`, JSON.stringify(data, null, 2));
}
for (const art of ["storybook", "ink"])
  test(`${art}: asset/collision/reset and real moving combat`, async ({
    page,
  }) => {
    await page.goto(`/?scene=trial/mixed&art=${art}&quality=lightweight`);
    await page.waitForFunction(() => !!window.__RUINWEAVERS__);
    const api = await page.evaluate(
      () => window.__RUINWEAVERS__.getMetrics().render.art,
    );
    expect(api.ready).toBe(true);
    expect(api.assets).toBe(9);
    expect(api.error).toBe("");
    expect(api.bounds.mage[1]).toBeCloseTo(0, 1);
    expect(api.bounds.cover[3] - api.bounds.cover[0]).toBeCloseTo(1.8, 1);
    await expect(page.locator("#panel")).toBeHidden();
    await capture(page, `${art}-entry`);
    await page.locator("#trial-action").click();
    await page.keyboard.down("w");
    await page.keyboard.down("a");
    await page.mouse.move(850, 340);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.keyboard.press("Space");
    await page.waitForTimeout(300);
    await page.mouse.up();
    await page.keyboard.up("w");
    await page.keyboard.up("a");
    await capture(page, `${art}-moving`);
    await page.evaluate(() => {
      window.__RUINWEAVERS__.resetLab();
      window.__RUINWEAVERS__.setPaused(true);
      window.__RUINWEAVERS__.setupTestState({
        enemyEnabled: false,
        entities: [{ id: "mage-1", pos: { x: 0, y: 0.75, z: -3 } }],
      });
      window.__RUINWEAVERS__.setPaused(false);
    });
    await page.locator("#trial-action").click();
    await page.waitForTimeout(200);
    await capture(page, `${art}-quiet`);
    const before = await page.evaluate(
      () => window.__RUINWEAVERS__.getMetrics().render,
    );
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.__RUINWEAVERS__.resetLab());
      await page.waitForTimeout(150);
    }
    const after = await page.evaluate(
      () => window.__RUINWEAVERS__.getMetrics().render,
    );
    expect(after.geometries).toBeLessThanOrEqual(before.geometries + 2);
    expect(after.textures).toBe(before.textures);
    expect(after.art.animationMixers).toBe(1);
    writeFileSync(
      `${dir}/${art}-resets.json`,
      JSON.stringify({ before, after }, null, 2),
    );
  });
