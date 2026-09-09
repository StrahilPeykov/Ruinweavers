import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const dir = "artifacts/coop-trial/solo-regression/browser";
const state = (p: Page) => p.evaluate(() => window.__RUINWEAVERS__.getState());
async function ticks(p: Page, n: number) {
  const t = (await state(p)).tick;
  await p.waitForFunction((t) => {
    const s = window.__RUINWEAVERS__.getState();
    return s.tick >= t || s.trial.status !== "active";
  }, t + n);
}
async function aim(p: Page, pos: any) {
  const at = await p.evaluate(
    (pos) => window.__RUINWEAVERS__.projectWorld(pos),
    pos,
  );
  await p.mouse.move(at.x, at.y);
}
async function capture(p: Page, name: string, fixture = false) {
  mkdirSync(dir, { recursive: true });
  await p.screenshot({ path: `${dir}/${name}.png` });
  const data = await p.evaluate(() => {
    const a = window.__RUINWEAVERS__,
      gl = document.querySelector("canvas")!.getContext("webgl2")!,
      ext = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      state: a.getState(),
      config: a.getExperimentConfig(),
      metrics: a.getMetrics(),
      browser: navigator.userAgent,
      viewport: { width: innerWidth, height: innerHeight },
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown",
    };
  });
  writeFileSync(
    `${dir}/${name}.json`,
    JSON.stringify(
      {
        runtime: execFileSync("git", ["rev-parse", "--short", "HEAD"])
          .toString()
          .trim(),
        fixture,
        ...data,
      },
      null,
      2,
    ),
  );
}
test("default trial starts explicitly and supports normal mixed-pressure controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.waitForFunction(() => !!window.__RUINWEAVERS__);
  expect((await state(page)).trial.status).toBe("ready");
  await expect(page.locator("#panel")).toBeHidden();
  await capture(page, "01-ready");
  await page.keyboard.press("e");
  await ticks(page, 3);
  expect((await state(page)).trial.status).toBe("active");
  await page.evaluate(() =>
    window.__RUINWEAVERS__.setExperimentConfig({ scene: "trial/mixed" }),
  );
  await page.getByRole("button", { name: "Start trial", exact: true }).click();
  await aim(page, { x: 5, y: 0, z: 3 });
  await page.keyboard.down("a");
  await page.keyboard.down("j");
  await ticks(page, 35);
  await page.keyboard.press("Space");
  await page.keyboard.press("2");
  await page.keyboard.press("f");
  await ticks(page, 20);
  await page.keyboard.up("a");
  await page.keyboard.up("j");
  const s = await state(page);
  expect(s.metrics.dodges).toBe(1);
  expect(s.entities.filter((e: any) => e.ai)).toHaveLength(4);
  await ticks(page, 10);
  await page.keyboard.press("f");
  await ticks(page, 5);
  expect((await state(page)).metrics.casts["Tide:secondary"]).toBeGreaterThan(
    0,
  );
  await capture(page, "02-mixed-pressure");
  expect(errors).toEqual([]);
  await page
    .getByRole("button", { name: "Restart trial", exact: true })
    .click();
  expect((await state(page)).trial.status).toBe("ready");
  expect((await state(page)).entities[0].hp).toBe(100);
});
test("real casts clear reduced-health lifecycle fixtures, carry health and restart victory/defeat", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/?scene=trial&scenario=open-near");
  await page.waitForFunction(() => !!window.__RUINWEAVERS__);
  await page.getByRole("button", { name: "Start trial", exact: true }).click();
  for (let stage = 0; stage < 3; stage++) {
    await page.evaluate(() => {
      const a = window.__RUINWEAVERS__;
      a.setPaused(true);
      const s = a.getState();
      a.setupTestState({
        entities: s.entities
          .filter((e: any) => e.ai)
          .map((e: any) => ({ id: e.id, hp: 1 })),
      });
      a.setPaused(false);
    });
    const health = (await state(page)).entities[0].hp;
    await page.keyboard.press("1");
    await page.keyboard.down("j");
    for (let i = 0; i < 120; i++) {
      const s = await state(page);
      if (s.trial.status !== "active") break;
      const p = s.entities[0],
        e = s.entities
          .filter((e: any) => e.ai && e.hp > 0)
          .sort(
            (a: any, b: any) =>
              Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) -
              Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z),
          )[0];
      await aim(page, { x: e.pos.x, y: e.pos.y, z: e.pos.z });
      await ticks(page, 4);
    }
    await page.keyboard.up("j");
    const s = await state(page);
    expect(s.trial.status).toBe(stage === 2 ? "victory" : "between");
    expect(s.entities[0].hp).toBeLessThanOrEqual(health);
    await capture(page, `fixture-stage-${stage + 1}`, true);
    if (stage < 2) {
      const carried = s.entities[0].hp;
      await page
        .getByRole("button", { name: "Next encounter", exact: true })
        .click();
      expect((await state(page)).entities[0].hp).toBe(carried);
    }
  }
  await page.locator("#trial-action").click();
  expect((await state(page)).entities[0].hp).toBe(100);
  await page.evaluate(() => {
    const a = window.__RUINWEAVERS__;
    a.setPaused(true);
    a.setupTestState({
      entities: [{ id: "mage-1", hp: 1, pos: { x: -3, y: 0.75, z: -2 } }],
    });
    a.setPaused(false);
  });
  await page.waitForFunction(
    () => window.__RUINWEAVERS__.getState().trial.status === "defeat",
  );
  await capture(page, "fixture-defeat", true);
  await page.locator("#trial-action").click();
  expect((await state(page)).entities[0].hp).toBe(100);
});

test("mouse casts combine and control normal-health pursuers while strafing", async ({
  page,
}) => {
  await page.goto("/?scene=trial/mixed&scenario=open-near");
  await page.waitForFunction(() => !!window.__RUINWEAVERS__);
  await page.getByRole("button", { name: "Start trial", exact: true }).click();
  await page.evaluate(() => {
    const a = window.__RUINWEAVERS__;
    a.setPaused(true);
    const s = a.getState();
    a.setupTestState({
      entities: [
        { id: "mage-1", pos: { x: 0, y: 0.75, z: 4 } },
        ...s.entities
          .filter((e: any) => e.kind === "pursuer")
          .map((e: any, i: number) => ({
            id: e.id,
            pos: { x: 2 + i, y: 0.6, z: 2 },
          })),
      ],
    });
    a.setPaused(false);
  });
  await page.keyboard.press("2");
  await aim(page, { x: 2, y: 0, z: 2 });
  await page.mouse.down({ button: "right" });
  await page.mouse.up({ button: "right" });
  await ticks(page, 8);
  await page.keyboard.press("1");
  await page.mouse.down();
  await page.keyboard.down("a");
  for (let i = 0; i < 8; i++) {
    const s = await state(page),
      e = s.entities.find((e: any) => e.kind === "pursuer" && e.hp > 0);
    if (!e) break;
    await aim(page, e.pos);
    await ticks(page, 8);
  }
  await page.mouse.up();
  await page.keyboard.up("a");
  expect((await state(page)).metrics.transformations.vaporize).toBeGreaterThan(
    0,
  );
  await page.keyboard.press("3");
  await page.keyboard.down("d");
  await ticks(page, 24);
  await page.keyboard.up("d");
  const s = await state(page),
    p = s.entities[0],
    e = s.entities
      .filter((e: any) => e.ai && e.hp > 0)
      .sort(
        (a: any, b: any) =>
          Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) -
          Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z),
      )[0];
  await aim(page, e.pos);
  await page.mouse.down();
  await ticks(page, 2);
  await page.mouse.up();
  expect((await state(page)).metrics.casts["Gale:primary"]).toBeGreaterThan(0);
  expect(
    Object.values((await state(page)).metrics.damageRoutes).some(
      (r: any) =>
        r.reason === "pressure" && r.recipient.startsWith("encounter-"),
    ),
  ).toBe(true);
  await capture(page, "03-mouse-reaction-control", true);
});
