import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const runtimeCommit = execFileSync("git", ["rev-parse", "--short", "HEAD"])
  .toString()
  .trim();
const dir = `test-results/reliability-${Date.now()}`;
const state = (p: Page) => p.evaluate(() => window.__RUINWEAVERS__.getState());
async function ticks(p: Page, n: number) {
  const t = (await state(p)).tick;
  await p.waitForFunction(
    (t) => window.__RUINWEAVERS__.getState().tick >= t,
    t + n,
  );
}
async function aim(p: Page, pos: { x: number; y: number; z: number }) {
  const at = await p.evaluate(
    (pos) => window.__RUINWEAVERS__.projectWorld(pos),
    pos,
  );
  await p.mouse.move(at.x, at.y);
  await ticks(p, 2);
}
async function boot(p: Page, scene = "states") {
  await p.goto(
    `/?scene=${scene}&model=primary-secondary&camera=balanced&tempo=balanced&seed=123`,
  );
  await p.waitForFunction(() => !!window.__RUINWEAVERS__);
  mkdirSync(dir, { recursive: true });
}
async function capture(p: Page, name: string) {
  await p.screenshot({ path: `${dir}/${name}.png` });
  const data = await p.evaluate((runtimeCommit) => {
    const a = window.__RUINWEAVERS__,
      gl = document.querySelector("canvas")!.getContext("webgl2")!,
      ext = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      build: `Combat Trial 0.1 legacy regression / runtime ${runtimeCommit}`,
      url: location.href,
      browser: navigator.userAgent,
      viewport: {
        width: innerWidth,
        height: innerHeight,
        dpr: devicePixelRatio,
      },
      renderer: ext
        ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
      config: a.getExperimentConfig(),
      state: a.getState(),
      targeting: a.getTargeting(),
      metrics: a.getMetrics(),
    };
  }, runtimeCommit);
  data.build = `Combat Trial 0.1 legacy regression / runtime ${runtimeCommit}`;
  writeFileSync(`${dir}/${name}.json`, JSON.stringify(data, null, 2));
}

test("body and feet aiming, raised casts and preview execution through real pointing", async ({
  page,
}) => {
  await boot(page);
  await aim(page, { x: -5, y: 0.9, z: -5.5 });
  await page.keyboard.press("2");
  await page.mouse.down();
  await ticks(page, 3);
  await page.mouse.up();
  expect(
    (await state(page)).entities.find((e: any) => e.id === "timber").wet,
  ).toBeGreaterThan(0.3);
  await page.keyboard.press("1");
  await page.mouse.down();
  await ticks(page, 45);
  await page.mouse.up();
  expect((await state(page)).metrics.transformations.vaporize).toBeGreaterThan(
    0,
  );
  await capture(page, "01-body-thermal-reaction");
  // Test feet geometry independently: residual heat legitimately vaporizes a new jet.
  await page.evaluate(() => {
    const api = window.__RUINWEAVERS__;
    api.setPaused(true);
    api.setupTestState({ entities: [{ id: "timber", heat: 0, wet: 0 }] });
    api.setPaused(false);
  });
  await aim(page, { x: -5, y: 0, z: -5.5 });
  await page.keyboard.press("2");
  await ticks(page, 30);
  await page.mouse.down();
  await ticks(page, 3);
  await page.mouse.up();
  expect(
    (await state(page)).entities.find((e: any) => e.id === "timber").wet,
  ).toBeGreaterThan(0.3);
  await page.evaluate(() => {
    const a = window.__RUINWEAVERS__;
    a.setPaused(true);
    a.setupTestState({
      entities: [
        { id: "mage-1", pos: { x: -10, y: 1.95, z: -9 } },
        { id: "dummy", pos: { x: -5, y: 0.65, z: -9 } },
      ],
    });
    a.setPaused(false);
  });
  await aim(page, { x: -5, y: 0.65, z: -9 });
  await ticks(page, 30);
  await page.mouse.down();
  await ticks(page, 3);
  await page.mouse.up();
  expect(
    (await state(page)).entities.find((e: any) => e.id === "dummy").wet,
  ).toBeGreaterThan(0.3);
  await capture(page, "02a-upper-jet-clears-ledge");
  await page.evaluate(() => {
    const a = window.__RUINWEAVERS__;
    a.setPaused(true);
    a.setupTestState({
      entities: [{ id: "mage-1", pos: { x: -7.5, y: 1.95, z: -9 } }],
    });
    a.setPaused(false);
  });
  await aim(page, { x: -5, y: 0.65, z: -9 });
  await ticks(page, 30);
  await page.mouse.down();
  await ticks(page, 3);
  await page.mouse.up();
  expect(
    (await state(page)).entities.find((e: any) => e.id === "dummy").wet,
  ).toBeGreaterThan(0.3);
  await capture(page, "02-raised-jet");
  await aim(page, { x: -10, y: 1.2, z: -11 });
  const preview = await page.evaluate(
    () => window.__RUINWEAVERS__.getTargeting().secondary,
  );
  await page.mouse.down({ button: "right" });
  await ticks(page, 3);
  await page.mouse.up({ button: "right" });
  const f = (await state(page)).fields[0];
  expect(f.pos.y).toBeCloseTo(preview.pos.y, 2);
  expect(f.pos.y).toBeCloseTo(1.2, 2);
  await capture(page, "03-raised-basin");
});

test("mouse and keyboard buffered Secondary capture intent without repeats; focus/menu clear it", async ({
  page,
}) => {
  await boot(page);
  await aim(page, { x: -4, y: 0, z: -3 });
  await page.keyboard.press("2");
  for (const device of ["keyboard", "mouse"]) {
    await page.evaluate(() => {
      const a = window.__RUINWEAVERS__;
      a.setPaused(true);
      a.setupTestState({ secondaryRemaining: 0.12 });
      a.setPaused(false);
    });
    if (device === "keyboard") await page.keyboard.down("f");
    else await page.mouse.down({ button: "right" });
    await ticks(page, 30);
    if (device === "keyboard") await page.keyboard.up("f");
    else await page.mouse.up({ button: "right" });
  }
  let s = await state(page);
  expect(s.metrics.casts["Tide:secondary"]).toBe(2);
  expect(s.events.filter((e: any) => e.type === "buffered")).toHaveLength(2);
  expect(s.metrics.inputs["secondary:mouse"]).toBe(1);
  expect(s.metrics.inputs["secondary:keyboard-fallback"]).toBe(1);
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  expect(
    (await page.evaluate(() => window.__RUINWEAVERS__.getMetrics())).audio
      .muted,
  ).toBe(true);
  await page.getByRole("button", { name: "Unmute", exact: true }).click();
  await page.keyboard.down("w");
  await page.keyboard.press("Space");
  await ticks(page, 8);
  await page.keyboard.press("f");
  await ticks(page, 20);
  await page.keyboard.up("w");
  s = await state(page);
  expect(s.metrics.dodges).toBe(1);
  expect(s.metrics.casts["Tide:secondary"]).toBe(3);
  await capture(page, "04-buffered-input");
  await page.evaluate(() =>
    window.__RUINWEAVERS__.setExperimentConfig({ inputBuffer: 0 }),
  );
  await page.evaluate(() => {
    const a = window.__RUINWEAVERS__;
    a.setPaused(true);
    a.setupTestState({ secondaryRemaining: 0.5 });
    a.setPaused(false);
  });
  await page.keyboard.press("f");
  await ticks(page, 15);
  expect((await state(page)).metrics.casts["Tide:secondary"]).toBe(3);
  await capture(page, "05-rejected-input-zero-buffer");
  // Focus loss resets all physical actions, including a held repeat.
  await page.keyboard.down("j");
  await ticks(page, 3);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  const before = (await state(page)).metrics.casts["Tide:primary"];
  await ticks(page, 40);
  // A second down while physically held is an OS-repeat event in Playwright.
  await page.keyboard.down("j");
  await ticks(page, 30);
  await page.keyboard.up("j");
  expect((await state(page)).metrics.casts["Tide:primary"]).toBe(before);
  await page.getByRole("button", { name: "Experiments", exact: true }).click();
  await expect(page.locator("#panel")).toBeVisible();
  await page.locator("#model").selectOption("weave-unweave");
  await page.getByRole("button", { name: "×", exact: true }).click();
  expect((await state(page)).bufferedCast).toBeUndefined();
});

test("Stone support, replacement, expiry and gap rejection stay visible and predictable", async ({
  page,
}) => {
  await boot(page, "traversal");
  await aim(page, { x: 9.5, y: 0, z: 0 });
  await page.keyboard.press("4");
  await page.keyboard.press("f");
  await ticks(page, 10);
  await page.keyboard.down("d");
  await ticks(page, 35);
  await page.keyboard.up("d");
  expect((await state(page)).entities[0].pos.y).toBeGreaterThan(1.1);
  await aim(page, { x: 9.5, y: 0.85, z: 0 });
  await capture(page, "06-slab-top-target");
  expect(
    (await page.evaluate(() => window.__RUINWEAVERS__.getTargeting())).primary
      .pos.y,
  ).toBeCloseTo(0.85, 2);
  await page.keyboard.press("2");
  await ticks(page, 3);
  expect(
    (await page.evaluate(() => window.__RUINWEAVERS__.getTargeting())).secondary
      .valid,
  ).toBe(false);
  await page.keyboard.press("f");
  await ticks(page, 3);
  expect((await state(page)).fields[0].principle).toBe("Stone");
  await capture(page, "07-no-support-after-replacement");
  await aim(page, { x: 12.7, y: 0, z: 0 });
  await page.keyboard.press("f");
  await ticks(page, 100);
  expect((await state(page)).fields[0].principle).toBe("Tide");
  expect((await state(page)).metrics.falls).toBe(1);
  await capture(page, "08-support-removed");
  // Expiry keeps the physical slab visibly present until its lifetime ends.
  await page.evaluate(() => window.__RUINWEAVERS__.resetLab());
  await aim(page, { x: 6, y: 0, z: -1 });
  await page.keyboard.press("4");
  await page.keyboard.press("f");
  await ticks(page, 10);
  await page.evaluate(() => {
    const a = window.__RUINWEAVERS__;
    a.setPaused(true);
    a.setupTestState({ fieldLife: 1.5 });
    a.setPaused(false);
  });
  await capture(page, "09-expiring-support");
  await ticks(page, 100);
  expect((await state(page)).fields).toHaveLength(0);
});
