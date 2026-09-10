import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const dir = "artifacts/art-finish";
mkdirSync(dir, { recursive: true });
for (const treatment of ["original", "illustrated"])
  test(`shared geometry corrective comparison ${treatment}`, async ({
    page,
  }) => {
    await page.goto(
      `/?scene=trial/mixed&art=storybook&treatment=${treatment}&quality=lightweight`,
    );
    await page.waitForFunction(() => !!window.__RUINWEAVERS__);
    await page.locator("#trial-action").click();
    await page.evaluate(() => {
      const a = window.__RUINWEAVERS__;
      a.setPaused(true);
      a.setupTestState({ enemyEnabled: false });
      a.setPaused(false);
    });
    await page.waitForTimeout(500);
    await page.addStyleTag({ content: "h1{visibility:hidden}" });
    await page.screenshot({ path: `${dir}/shared-geometry-${treatment}.png` });
    const data = await page.evaluate(() => ({
      build: window.__RUINWEAVERS__.getNetworkState().build,
      render: window.__RUINWEAVERS__.getMetrics().render,
      state: window.__RUINWEAVERS__.getState(),
    }));
    expect(data.render.art.active).toBe(true);
    writeFileSync(
      `${dir}/shared-geometry-${treatment}.json`,
      JSON.stringify(data, null, 2),
    );
  });
