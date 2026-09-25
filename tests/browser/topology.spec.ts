import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const out = `artifacts/topology-0.3/raw/focused-${Date.now()}`;
async function clearFixture(page: any) {
  await page.evaluate(() => {
    const a = window.__RUINWEAVERS__;
    a.setPaused(true);
    a.setupTestState({
      entities: a
        .getState()
        .entities.filter((e: any) => e.ai)
        .map((e: any) => ({ id: e.id, hp: 0 })),
    });
    a.setPaused(false);
  });
  await page.waitForFunction(
    () => window.__RUINWEAVERS__.getState().trial.status === "between",
  );
}
test("route-only boundary rejects a carried combat click and accepts a fresh destination press", async ({
  page,
}) => {
  mkdirSync(out, { recursive: true });
  await page.goto("/?scene=run&seed=123&quality=lightweight");
  await page.waitForFunction(() => !!window.__RUINWEAVERS__);
  await page.locator("#trial-action").click();
  await clearFixture(page); // Reach the no-reward second boundary; not a combat claim.
  await page.locator("#reward-cards button").first().click();
  await page.locator("#route-cards button").first().click();
  await page.locator("#trial-action").click();
  await page.mouse.move(500, 400);
  await page.mouse.down();
  await clearFixture(page);
  const card = page.locator("#route-cards button").first();
  await expect(card).toBeVisible();
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  expect(
    await page.evaluate(
      () => window.__RUINWEAVERS__.getState().run.route.decision.selected,
    ),
  ).toBeUndefined();
  await expect(page.locator("#trial-action")).toBeDisabled();
  await card.click();
  await expect(page.locator("#trial-action")).toBeEnabled();
  await page.screenshot({ path: `${out}/route-fresh-press-fixture.png` });
});
test("new authored courts support actual casting/movement in both device-local render modes", async ({
  page,
}) => {
  test.setTimeout(90000);
  mkdirSync(out, { recursive: true });
  const evidence = [];
  for (const quality of ["lightweight", "standard"])
    for (const room of ["approach", "diagonal"]) {
      await page.goto(
        `/?scene=trial/mixed&room=${room}&art=illustrated&quality=${quality}&seed=123`,
      );
      await page.waitForFunction(
        () => window.__RUINWEAVERS__?.getMetrics().render.art.active,
      );
      await page.locator("#trial-action").click();
      const p = await page.evaluate(() =>
        window.__RUINWEAVERS__.projectWorld({ x: 0, y: 0, z: -4 }),
      );
      await page.mouse.move(p.x, p.y);
      await page.keyboard.down("d");
      await page.mouse.down();
      await page.waitForTimeout(450);
      await page.keyboard.up("d");
      await page.keyboard.press("2");
      await page.keyboard.press("f");
      await page.waitForTimeout(700);
      await page.keyboard.press("Space");
      await page.waitForTimeout(1400);
      await page.mouse.up();
      await page.screenshot({ path: `${out}/${room}-${quality}-combat.png` });
      const state = await page.evaluate(() =>
        window.__RUINWEAVERS__.getState(),
      );
      expect(state.roomId).toBe(room);
      expect(state.metrics.falls).toBe(0);
      expect(Object.keys(state.metrics.casts).length).toBeGreaterThan(0);
      const resources = [];
      for (let i = 0; i < 4; i++) {
        await page.evaluate(() => window.__RUINWEAVERS__.resetLab());
        await page.waitForTimeout(150);
        resources.push(
          await page.evaluate(() => {
            const m = window.__RUINWEAVERS__.getMetrics().render;
            return { geometries: m.geometries, textures: m.textures };
          }),
        );
      }
      expect(resources[3].geometries).toBeLessThanOrEqual(
        resources[1].geometries + 2,
      );
      expect(resources[3].textures).toBe(resources[1].textures);
      evidence.push({
        room,
        quality,
        build: await page.evaluate(
          () => window.__RUINWEAVERS__.getNetworkState().build,
        ),
        render: await page.evaluate(
          () => window.__RUINWEAVERS__.getMetrics().render,
        ),
        resources,
      });
    }
  writeFileSync(`${out}/render.json`, JSON.stringify(evidence, null, 2));
});
