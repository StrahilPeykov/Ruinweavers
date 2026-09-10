const evidenceRoot = `test-results/evidence-art-finish.spec-${Date.now()}`;
import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const dir = process.env.RUIN_ART_CAPTURE_ROOT ?? `${evidenceRoot}/art-finish`;
mkdirSync(dir, { recursive: true });
test("finished benchmark frame and movement", async ({ page }) => {
  await page.goto("/?scene=trial/mixed&art=illustrated&quality=lightweight");
  await page.waitForFunction(() => !!window.__RUINWEAVERS__);
  await page.locator("#trial-action").click();
  await page.evaluate(() => {
    const a = window.__RUINWEAVERS__;
    a.setPaused(true);
    a.setupTestState({ enemyEnabled: false });
    a.setPaused(false);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/benchmark-lightweight.png` });
  await page.keyboard.down("w");
  await page.keyboard.down("d");
  await page.waitForTimeout(350);
  await page.waitForFunction(
    () =>
      Math.abs(
        window.__RUINWEAVERS__.getMetrics().render.performances[0]?.pose
          ?.stride ?? 0,
      ) > 0.01,
  );
  await page.mouse.move(400, 310);
  await page.keyboard.press("j");
  await page.screenshot({ path: `${dir}/benchmark-moving.png` });
  await page.keyboard.up("w");
  await page.keyboard.up("d");
  const render = await page.evaluate(
    () => window.__RUINWEAVERS__.getMetrics().render,
  );
  expect(render.art.assets).toBe(10);
  expect(render.art.error).toBe("");
  expect(render.performances[0].bodyScale * 1.9).toBeCloseTo(
    await page.evaluate(() => window.__RUINWEAVERS__.getPlayerState().height),
    5,
  );
  const build = await page.evaluate(
    () => window.__RUINWEAVERS__.getNetworkState().build,
  );
  const before = render;
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.__RUINWEAVERS__.resetLab());
    await page.waitForTimeout(120);
  }
  const after = await page.evaluate(
    () => window.__RUINWEAVERS__.getMetrics().render,
  );
  expect(after.geometries).toBeLessThanOrEqual(before.geometries + 2);
  expect(after.textures).toBe(before.textures);
  await page.locator("#experiments").click();
  await page.locator("#quality").selectOption("standard");
  await page.locator("#close").click();
  await page.locator("#trial-action").click();
  await page.evaluate(() => {
    const a = window.__RUINWEAVERS__;
    a.setPaused(true);
    a.setupTestState({ enemyEnabled: false });
    a.setPaused(false);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/benchmark-standard.png` });
  const standard = await page.evaluate(
    () => window.__RUINWEAVERS__.getMetrics().render,
  );
  await page.evaluate(() => {
    const a = window.__RUINWEAVERS__;
    a.setPaused(true);
    a.setupTestState({ entities: [{ id: "mage-1", hp: 0 }] });
    a.setPaused(false);
  });
  await page.waitForFunction(
    () =>
      window.__RUINWEAVERS__.getMetrics().render.performances[0]?.pose?.downed,
  );
  await page.screenshot({ path: `${dir}/benchmark-downed.png` });
  writeFileSync(
    `${dir}/benchmark.json`,
    JSON.stringify({ build, before, after, standard }, null, 2),
  );
});
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
