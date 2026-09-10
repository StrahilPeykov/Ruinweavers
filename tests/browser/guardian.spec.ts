import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const root =
  process.env.RUIN_GUARDIAN_OUTPUT ?? `test-results/guardian-${Date.now()}`;
const held = new WeakMap<Page, boolean>();
test.use({
  video: process.env.RUIN_GUARDIAN_VIDEO
    ? { mode: "on", size: { width: 1440, height: 900 } }
    : "off",
});
async function boot(p: Page) {
  await p.goto(
    `/?scene=guardian&seed=123&quality=${process.env.RUIN_GUARDIAN_QUALITY ?? "lightweight"}`,
  );
  await p.waitForFunction(
    () => window.__RUINWEAVERS__?.getMetrics().render.art.ready,
  );
}
async function install(p: Page, name: string) {
  await p.evaluate(async (name) => {
    const { GuardianPolicy } = await import(
      "/src/diagnostics/guardian-policy.ts" as string
    );
    (window as any).guardianPolicy = new GuardianPolicy(name);
    (window as any).guardianFrames = [];
    (window as any).guardianMeasuring = true;
    let last = performance.now();
    const sample = (now: number) => {
      if (!(window as any).guardianMeasuring) return;
      (window as any).guardianFrames.push(now - last);
      last = now;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, name);
}
async function drive(p: Page) {
  const command = await p.evaluate(() => {
    const api = window.__RUINWEAVERS__,
      s = api.getState(),
      player = api.getPlayerState();
    const f = (window as any).guardianPolicy.input({
      state: s,
      actorId: player.id,
      player,
      physics: { terrainHit: (a: any, b: any) => api.isPathBlocked(a, b) },
    });
    return { f, pixel: api.projectWorld(f.aim) };
  });
  const { f, pixel } = command;
  for (const [k, down] of [
    ["w", f.moveZ < -0.1],
    ["s", f.moveZ > 0.1],
    ["a", f.moveX < -0.1],
    ["d", f.moveX > 0.1],
  ] as const) {
    if (down) await p.keyboard.down(k);
    else await p.keyboard.up(k);
  }
  await p.keyboard.press(
    String(["Ember", "Tide", "Gale", "Stone"].indexOf(f.select) + 1),
  );
  await p.mouse.move(pixel.x, pixel.y);
  if (f.primary !== (held.get(p) ?? false)) {
    if (f.primary) await p.mouse.down();
    else await p.mouse.up();
    held.set(p, f.primary);
  }
  if (f.secondary) await p.keyboard.press("f");
  if (f.dodge) await p.keyboard.press("Space");
}
async function release(p: Page) {
  for (const k of ["w", "a", "s", "d"]) await p.keyboard.up(k);
  await p.mouse.up();
  held.set(p, false);
}
async function capture(p: Page, name: string) {
  mkdirSync(root, { recursive: true });
  await p.screenshot({ path: `${root}/${name}.png` });
}
async function fight(pages: Page[], name: string) {
  const seen = new Set<string>();
  let started = Date.now();
  while (Date.now() - started < 150000) {
    const s = await pages[0].evaluate(() => window.__RUINWEAVERS__.getState());
    const key = `${s.guardian.phase}-${s.guardian.maneuver}-${s.guardian.stage}`;
    if (!seen.has(key) && ["commit", "shift"].includes(s.guardian.stage)) {
      seen.add(key);
      if (seen.size <= 5) await capture(pages.at(-1)!, `${name}-${key}`);
    }
    if (s.trial.status !== "active") {
      for (const p of pages) await release(p);
      await capture(pages.at(-1)!, `${name}-${s.trial.status}`);
      const reports = [];
      for (const p of pages)
        reports.push(
          await p.evaluate(async () => {
            (window as any).guardianMeasuring = false;
            const api = window.__RUINWEAVERS__,
              f = (window as any).guardianFrames.sort(
                (a: number, b: number) => a - b,
              );
            return {
              build: api.getNetworkState().build,
              browser: navigator.userAgent,
              viewport: [innerWidth, innerHeight],
              metrics: api.getMetrics(),
              network: await api.getNetworkDiagnostics(),
              state: api.getState(),
              frames: {
                count: f.length,
                mean: f.reduce((a: number, b: number) => a + b, 0) / f.length,
                p50: f[Math.floor(f.length * 0.5)],
                p95: f[Math.floor(f.length * 0.95)],
                p99: f[Math.floor(f.length * 0.99)],
              },
            };
          }),
        );
      mkdirSync(root, { recursive: true });
      writeFileSync(
        `${root}/${name}.json`,
        JSON.stringify(
          {
            fixture:
              "Isolated fifth court with explicit starting build; all combat uses real keyboard/mouse",
            wallSeconds: (Date.now() - started) / 1000,
            seen: [...seen],
            reports,
          },
          null,
          2,
        ),
      );
      expect(s.trial.status).toBe("victory");
      expect(s.guardian.stage).toBe("fallen");
      return;
    }
    for (const p of pages) await drive(p);
    await pages[0].waitForTimeout(70);
  }
  throw Error("Guardian input journey timed out");
}
for (const name of process.env.RUIN_GUARDIAN_CASE
  ? [process.env.RUIN_GUARDIAN_CASE]
  : ["base", "reaction", "field", "structure", "basin"])
  test(`Guardian real-input ${name} build`, async ({ page }) => {
    test.setTimeout(180000);
    await boot(page);
    await page.evaluate(async (name) => {
      const { GUARDIAN_BUILDS } = await import(
        "/src/diagnostics/guardian-policy.ts" as string
      );
      const api = window.__RUINWEAVERS__;
      api.setPaused(true);
      api.setupTestState({
        guardianBuilds: { "mage-1": GUARDIAN_BUILDS[name] },
      });
      api.setPaused(false);
    }, name);
    await page.locator("#trial-action").click();
    await install(page, name);
    await fight([page], name);
    await page.locator("#retry-seed").click();
    const reset = await page.evaluate(() => window.__RUINWEAVERS__.getState());
    expect(reset.guardian.phase).toBe(1);
    expect(reset.run.upgrades["mage-1"]).toEqual([]);
    expect(reset.seed).toBe(123);
  });
test("Guardian two-client targeting, live revive input, victory and synchronized retry", async ({
  browser,
}) => {
  test.setTimeout(180000);
  const ca = await browser.newContext(),
    cb = await browser.newContext(),
    a = await ca.newPage(),
    b = await cb.newPage();
  try {
    for (const p of [a, b]) {
      await boot(p);
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
    await a.evaluate(async () => {
      const { GUARDIAN_BUILDS } = await import(
        "/src/diagnostics/guardian-policy.ts" as string
      );
      const api = window.__RUINWEAVERS__;
      api.setPaused(true);
      api.setupTestState({
        guardianBuilds: {
          "mage-1": GUARDIAN_BUILDS.reaction,
          "mage-2": GUARDIAN_BUILDS.field,
        },
      });
      api.setPaused(false);
    });
    for (const p of [a, b]) await p.locator("#trial-action").click();
    await b.waitForFunction(
      () => window.__RUINWEAVERS__.getState().trial.status === "active",
    );
    // Labeled lifecycle fixture: one downed actor near survivor. Guardian remains active.
    await a.evaluate(() => {
      const api = window.__RUINWEAVERS__;
      api.setPaused(true);
      api.setupTestState({
        entities: [
          { id: "mage-1", hp: 0, pos: { x: -6, y: 0.75, z: 6 } },
          { id: "mage-2", pos: { x: -5, y: 0.75, z: 6 } },
        ],
      });
      api.setPaused(false);
    });
    await b.waitForFunction(
      () =>
        window.__RUINWEAVERS__
          .getState()
          .entities.find((e: any) => e.id === "mage-1").hp === 0,
    );
    await b.keyboard.down("e");
    await a.waitForFunction(
      () => window.__RUINWEAVERS__.getPlayerState().hp > 0,
    );
    await b.keyboard.up("e");
    await install(a, "reaction");
    await install(b, "field");
    await fight([a, b], "pair");
    await a.locator("#retry-seed").click();
    await b.waitForFunction(
      () => window.__RUINWEAVERS__.getState().trial.status === "ready",
    );
    expect(
      await b.evaluate(() => window.__RUINWEAVERS__.getState().guardian.phase),
    ).toBe(1);
  } finally {
    await ca.close();
    await cb.close();
  }
});
test("real Stone placement blocks Guardian shards; a real Gale tap redirects them", async ({
  page,
}) => {
  for (const principle of ["Stone", "Gale"]) {
    await boot(page);
    await page.locator("#trial-action").click();
    await page.evaluate(() => {
      const api = window.__RUINWEAVERS__;
      api.setPaused(true);
      api.setupTestState({
        entities: [{ id: "mage-1", pos: { x: 0, y: 0.75, z: 4 } }],
      });
      api.setPaused(false);
    });
    const point = await page.evaluate(() =>
      window.__RUINWEAVERS__.projectWorld({ x: 0, y: 0, z: 0 }),
    );
    await page.mouse.move(point.x, point.y);
    if (principle === "Stone") {
      await page.keyboard.press("4");
      await page.keyboard.press("f");
      await page.waitForFunction(
        () =>
          window.__RUINWEAVERS__.getState().metrics.outcomes[
            "projectile:warden:blocked"
          ] > 0,
      );
      expect(
        await page.evaluate(() => window.__RUINWEAVERS__.getPlayerState().hp),
      ).toBe(100);
    } else {
      await page.keyboard.press("3");
      await page.waitForFunction(() =>
        window.__RUINWEAVERS__
          .getState()
          .bolts.some((b: any) => b.originalSource === "warden" && b.pos.z > 0),
      );
      await page.mouse.down();
      await page.waitForTimeout(65);
      await page.mouse.up();
      await page.waitForFunction(
        () =>
          window.__RUINWEAVERS__.getState().metrics.outcomes[
            "projectile:warden:deflected"
          ] > 0,
      );
    }
    await capture(page, `defence-${principle}`);
  }
});
