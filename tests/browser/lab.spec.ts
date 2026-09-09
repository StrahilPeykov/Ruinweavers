import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

test("pause at reset displays resume and preserves a ready handoff", async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(() => {
    window.__RUINWEAVERS__.resetLab();
    window.__RUINWEAVERS__.setPaused(true);
  });
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  const before = await state(page);
  await page.keyboard.press("w");
  await page.keyboard.press("f");
  expect((await state(page)).tick).toBe(before.tick);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await ticks(page, 5);
  expect((await state(page)).fields).toHaveLength(0);
});

test("rebindings, optional wheel, and real interact preserve essential access", async ({
  page,
}) => {
  await boot(page, "traversal");
  await page.keyboard.press("e");
  await ticks(page, 3);
  expect((await state(page)).sentinel.enabled).toBe(true);
  await page.keyboard.press("e");
  await ticks(page, 3);
  expect((await state(page)).sentinel.enabled).toBe(false);
  await page.mouse.wheel(0, 200);
  await ticks(page, 3);
  expect((await state(page)).activePrinciple).toBe("Ember");
  await page.getByRole("button", { name: "Experiments", exact: true }).click();
  await page.getByText("Selected tunables", { exact: true }).click();
  await page.locator("#fallback").selectOption("KeyR");
  await page.locator("#cycle").selectOption("KeyC");
  await page.locator("#wheel").check();
  await page.getByRole("button", { name: "×", exact: true }).click();
  await page.keyboard.down("w");
  await page.keyboard.press("c");
  await ticks(page, 5);
  await page.keyboard.press("r");
  await ticks(page, 10);
  await page.keyboard.up("w");
  expect((await state(page)).activePrinciple).toBe("Tide");
  expect(
    (await state(page)).metrics.inputs["secondary:keyboard-fallback"],
  ).toBe(1);
  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, 200);
  await ticks(page, 5);
  expect((await state(page)).activePrinciple).toBe("Gale");
  expect(await page.locator(".hint").innerText()).toContain("R");
  expect(await page.locator(".hint").innerText()).toContain("C");
});
const state = (p: Page) => p.evaluate(() => window.__RUINWEAVERS__.getState());
async function boot(p: Page, scene = "input-compatibility") {
  await p.goto(`/?scene=magic-lab/${scene}`);
  await p.waitForFunction(() => !!window.__RUINWEAVERS__);
}
async function aim(p: Page, x: number, z: number) {
  const at = await p.evaluate(
    ({ x, z }) => window.__RUINWEAVERS__.projectWorld({ x, y: 0, z }),
    { x, z },
  );
  await p.mouse.move(at.x, at.y);
}
async function ticks(p: Page, n: number) {
  const t = (await state(p)).tick;
  await p.waitForFunction(
    (t) => window.__RUINWEAVERS__.getState().tick >= t,
    t + n,
  );
}
test("actual movement, independent aim, all essential input paths, reset and resize", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await boot(page);
  const start = await state(page);
  await aim(page, -6, -3);
  await page.keyboard.down("w");
  await page.keyboard.down("d");
  await ticks(page, 30);
  await page.keyboard.up("w");
  await page.keyboard.up("d");
  let s = await state(page);
  expect(s.entities[0].pos.x).toBeGreaterThan(start.entities[0].pos.x + 1);
  expect(s.entities[0].pos.z).toBeLessThan(start.entities[0].pos.z - 1);
  expect(s.aim.x).toBeLessThan(0);
  for (const [key, name] of [
    ["1", "Ember"],
    ["2", "Tide"],
    ["3", "Gale"],
    ["4", "Stone"],
  ]) {
    await page.keyboard.press(key);
    await expect
      .poll(async () => (await state(page)).activePrinciple)
      .toBe(name);
  }
  await page.keyboard.press("Tab");
  await expect
    .poll(async () => (await state(page)).activePrinciple)
    .toBe("Ember");
  await page.keyboard.press("q");
  await expect
    .poll(async () => (await state(page)).activePrinciple)
    .toBe("Stone");
  await page.keyboard.press("1");
  await aim(page, 0, -4.5);
  await page.mouse.down();
  await ticks(page, 70);
  await page.mouse.up();
  expect((await state(page)).metrics.casts["Ember:primary"]).toBeGreaterThan(2);
  await page.mouse.click(700, 420, { button: "right" });
  await ticks(page, 45);
  expect((await state(page)).metrics.inputs["secondary:mouse"]).toBeGreaterThan(
    0,
  );
  await page.keyboard.down("a");
  await page.keyboard.down("f");
  await ticks(page, 55);
  await page.keyboard.up("f");
  await page.keyboard.up("a");
  s = await state(page);
  expect(s.metrics.inputs["secondary:keyboard-fallback"]).toBeGreaterThan(0);
  expect(s.metrics.casts["Ember:secondary"]).toBe(2);
  await page.keyboard.press("Space");
  await ticks(page, 20);
  expect((await state(page)).metrics.dodges).toBe(1);
  await page.evaluate(() => window.__RUINWEAVERS__.setInputProfile("laptop"));
  await page.keyboard.down("j");
  await ticks(page, 45);
  await page.keyboard.up("j");
  expect(
    (await state(page)).metrics.inputs["primary:keyboard-fallback"],
  ).toBeGreaterThan(1);
  expect(
    (await page.evaluate(() => window.__RUINWEAVERS__.getInputProfile()))
      .wheelOptional,
  ).toBe(false);
  mkdirSync("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/inputs.png" });
  await page.getByRole("button", { name: "Reset lab", exact: true }).click();
  await ticks(page, 5);
  s = await state(page);
  expect(s.metrics.dodges).toBe(0);
  expect(s.fields).toHaveLength(0);
  expect(s.entities[0].pos.x).toBeCloseTo(0, 1);
  await page.setViewportSize({ width: 860, height: 640 });
  await ticks(page, 10);
  await aim(page, 0, -4.5);
  await ticks(page, 5);
  await page.screenshot({ path: "artifacts/compact.png" });
  expect(await page.locator("canvas").boundingBox()).toMatchObject({
    width: 860,
    height: 640,
  });
  expect(errors).toEqual([]);
});
test("real state priming and transformation, models and camera evidence", async ({
  page,
}) => {
  await boot(page, "states");
  await aim(page, -5, -5.5);
  await page.keyboard.press("2");
  await page.mouse.click(
    ...(Object.values(
      await page.evaluate(() =>
        window.__RUINWEAVERS__.projectWorld({ x: -5, y: 0, z: -5.5 }),
      ),
    ) as [number, number]),
  );
  await ticks(page, 10);
  expect(
    (await state(page)).entities.find((e: any) => e.id === "timber").wet,
  ).toBeGreaterThan(0.3);
  await page.keyboard.press("1");
  await page.mouse.down();
  await ticks(page, 60);
  await page.mouse.up();
  expect((await state(page)).metrics.transformations.vaporize).toBeGreaterThan(
    0,
  );
  await page.screenshot({ path: "artifacts/thermal-states.png" });
  await page.getByRole("button", { name: "Experiments", exact: true }).click();
  await page.locator("#camera").selectOption("tactical");
  await page.getByRole("button", { name: "×", exact: true }).click();
  await ticks(page, 10);
  await page.screenshot({ path: "artifacts/camera-tactical.png" });
  await page.evaluate(() =>
    window.__RUINWEAVERS__.setCameraPreset("cinematic"),
  );
  await ticks(page, 10);
  await page.screenshot({ path: "artifacts/camera-cinematic.png" });
  await page.evaluate(() =>
    window.__RUINWEAVERS__.setExperimentConfig({
      model: "weave-unweave",
      camera: "balanced",
    }),
  );
  await aim(page, -5, -5.5);
  await page.keyboard.press("1");
  await page.mouse.down();
  await ticks(page, 65);
  await page.mouse.up();
  await ticks(page, 35);
  const heatBefore = (await state(page)).entities.find(
    (e: any) => e.id === "timber",
  ).heat;
  await page.keyboard.press("f");
  await ticks(page, 5);
  const cooled = (await state(page)).entities.find(
    (e: any) => e.id === "timber",
  );
  expect(cooled.heat).toBeLessThan(heatBefore - 90);
  expect(cooled.burning).toBe(false);
  writeFileSync(
    "artifacts/browser-state.json",
    JSON.stringify(
      {
        state: await state(page),
        metrics: await page.evaluate(() => window.__RUINWEAVERS__.getMetrics()),
      },
      null,
      2,
    ),
  );
});
test("combat pressure, dodge, field placement and traversal", async ({
  page,
}) => {
  await boot(page, "combat");
  await aim(page, 5, -8);
  await page.keyboard.down("a");
  await page.mouse.down();
  await ticks(page, 50);
  await page.keyboard.press("Space");
  await ticks(page, 25);
  await page.keyboard.up("a");
  await page.mouse.up();
  await page.keyboard.press("2");
  await aim(page, 5, -8);
  await page.keyboard.press("f");
  await ticks(page, 10);
  expect((await state(page)).fields).toHaveLength(1);
  await page.screenshot({ path: "artifacts/combat.png" });
  await page.evaluate(() =>
    window.__RUINWEAVERS__.setExperimentConfig({ scene: "traversal" }),
  );
  await ticks(page, 15);
  await aim(page, 9.5, 0);
  await page.keyboard.press("4");
  await page.keyboard.press("f");
  await ticks(page, 10);
  await page.keyboard.down("d");
  await ticks(page, 85);
  await page.keyboard.up("d");
  const s = await state(page);
  expect(s.entities[0].pos.x).toBeGreaterThan(11);
  expect(s.metrics.falls).toBe(0);
  await page.screenshot({ path: "artifacts/traversal.png" });
});
