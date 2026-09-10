const evidenceRoot = `test-results/evidence-run.spec-${Date.now()}`;
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const dir = process.env.RUIN_RUN_CAPTURE_ROOT ?? `${evidenceRoot}/run-0.1`;
const primaryHeld = new WeakMap<Page, boolean>();
const buildDirection = process.env.RUIN_BUILD_RUN;
const buildChoices: Record<string, string[]> = {
  reaction: ["forked-tide", "undertow", "shared-vapour"],
  field: ["double-inscription", "cross-seam", "migrating-inscriptions"],
  structure: ["stone-echo", "fault-line", "break-seal"],
};
test.use({
  video: process.env.RUIN_RUN_VIDEO
    ? { mode: "on", size: { width: 1440, height: 900 } }
    : "off",
});
test("a held combat press cannot choose a reward; a fresh card press can", async ({
  page,
}) => {
  await boot(page);
  await page.locator("#trial-action").click();
  const target = await page.evaluate(() => {
    const api = window.__RUINWEAVERS__,
      s = api.getState(),
      enemies = s.entities.filter((e: any) => e.ai);
    api.setPaused(true);
    api.setupTestState({
      enemyEnabled: false,
      entities: [
        { id: "mage-1", pos: { x: 0, y: 0.75, z: 4 } },
        ...enemies.map((e: any, i: number) => ({
          id: e.id,
          hp: i === 0 ? 8 : 0,
          pos: { x: 0, y: 0.8, z: 0 },
        })),
      ],
    });
    api.setPaused(false);
    return api.projectWorld({ x: 0, y: 0.8, z: 0 });
  });
  await page.mouse.move(target.x, target.y);
  await page.mouse.down();
  await page.waitForFunction(
    () => window.__RUINWEAVERS__.getState().trial.status === "between",
  );
  const card = page.locator("#reward-cards button").first();
  await expect(card).toBeVisible();
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  // Also cover the malformed repeated-down sequence that the old driver emitted.
  await page.mouse.down();
  await page.mouse.up();
  expect(
    await page.evaluate(
      () => window.__RUINWEAVERS__.getState().run.reward.choices["mage-1"],
    ),
  ).toBeUndefined();
  await card.click();
  await expect(page.locator("#reward-cards .chosen")).toBeVisible();
});
async function boot(p: Page) {
  await p.goto(
    `/?scene=run&seed=${buildDirection === "pair" ? 415 : buildDirection === "reaction" ? 143 : buildDirection ? 0 : 123}&quality=${process.env.RUIN_RUN_QUALITY ?? "lightweight"}`,
  );
  await p.waitForFunction(() => !!window.__RUINWEAVERS__);
}
test("guest opening the default run can join an unchanged trial host", async ({
  browser,
}) => {
  const ca = await browser.newContext(
      process.env.RUIN_RUN_VIDEO
        ? {
            recordVideo: {
              dir: `${dir}/raw`,
              size: { width: 1440, height: 900 },
            },
          }
        : {},
    ),
    cb = await browser.newContext(
      process.env.RUIN_RUN_VIDEO
        ? {
            recordVideo: {
              dir: `${dir}/raw`,
              size: { width: 1440, height: 900 },
            },
          }
        : {},
    ),
    a = await ca.newPage(),
    b = await cb.newPage();
  try {
    await a.goto("/?scene=trial&quality=lightweight");
    await a.waitForFunction(() => !!window.__RUINWEAVERS__);
    await boot(b);
    for (const p of [a, b]) {
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
    expect(
      await b.evaluate(() => window.__RUINWEAVERS__.getState().run),
    ).toBeUndefined();
    await expect(b.locator("#mode-title")).toHaveText("/ COMBAT TRIAL");
    for (const p of [a, b]) await p.locator("#trial-action").click();
    await b.waitForFunction(
      () => window.__RUINWEAVERS__.getState().trial.status === "active",
    );
  } finally {
    await ca.close();
    await cb.close();
  }
});
async function release(p: Page) {
  for (const k of ["w", "a", "s", "d", "j"]) await p.keyboard.up(k);
  await p.mouse.up();
  primaryHeld.set(p, false);
}
async function installPolicy(p: Page) {
  await p.evaluate(async (build) => {
    const { GuardianPolicy } = await import(
      "/src/diagnostics/guardian-policy.ts" as string
    );
    (window as any).guardianPolicy = new GuardianPolicy(
      build === "pair"
        ? window.__RUINWEAVERS__.getPlayerState().id === "mage-2"
          ? "structure"
          : "reaction"
        : (build ?? "basin"),
    );
    // Import the same transparent policy used by fast simulation batches. Its output
    // is translated to real Playwright keyboard/mouse actions outside the page.
    const { ScriptedPolicy } = await import(
      "/src/diagnostics/policies.ts" as string
    );
    (window as any).runPolicy = new ScriptedPolicy(
      "basin-ember",
      "delayed-aim",
      123,
      undefined,
      "keyboard",
    );
    if (build) {
      const { BuildPolicy } = await import(
        "/src/diagnostics/build-policies.ts" as string
      );
      const direction =
        build === "pair"
          ? window.__RUINWEAVERS__.getPlayerState().id === "mage-2"
            ? "structure"
            : "reaction"
          : build;
      (window as any).runPolicy = new BuildPolicy(direction);
    }
  }, buildDirection);
}
async function drive(p: Page) {
  const command = await p.evaluate(() => {
    const api = window.__RUINWEAVERS__,
      s = api.getState(),
      player = api.getPlayerState();
    const fake = {
      state: s,
      actorId: player.id,
      player,
      physics: { terrainHit: (a: any, b: any) => api.isPathBlocked(a, b) },
    };
    const input = (
      s.guardian ? (window as any).guardianPolicy : (window as any).runPolicy
    ).input(fake);
    return {
      input,
      pixel: api.projectWorld(input.aim),
      status: s.trial.status,
    };
  });
  if (command.status !== "active") return;
  const f = command.input;
  for (const [key, down] of [
    ["w", f.moveZ < -0.1],
    ["s", f.moveZ > 0.1],
    ["a", f.moveX < -0.1],
    ["d", f.moveX > 0.1],
  ] as const) {
    if (down) await p.keyboard.down(key);
    else await p.keyboard.up(key);
  }
  await p.keyboard.press(
    String(["Ember", "Tide", "Gale", "Stone"].indexOf(f.select) + 1),
  );
  await p.mouse.move(command.pixel.x, command.pixel.y);
  if (f.primary !== (primaryHeld.get(p) ?? false)) {
    if (f.primary) await p.mouse.down();
    else await p.mouse.up();
    primaryHeld.set(p, f.primary);
  }
  if (f.secondary) await p.keyboard.press("f");
  if (f.dodge) await p.keyboard.press("Space");
}
async function capture(p: Page, name: string) {
  mkdirSync(dir, { recursive: true });
  await p.screenshot({ path: `${dir}/${name}.png` });
}
async function complete(pages: Page[], label: string) {
  const started = Date.now();
  const menus = new Set<number>(),
    rooms = new Set<number>(),
    actions = new Set<number>();
  for (const p of pages)
    await p.evaluate(() => {
      const w = window as any;
      w.runFrames = [];
      w.measureRun = true;
      let last = performance.now();
      function sample(now: number) {
        if (!w.measureRun) return;
        const api = w.__RUINWEAVERS__,
          s = api.getState(),
          m = api.getMetrics().render;
        if (w.runFrames.length < 30000)
          w.runFrames.push({
            ms: now - last,
            room: s.trial.encounter,
            status: s.trial.status,
            draws: m.drawCalls,
            geometries: m.geometries,
            textures: m.textures,
            fields: s.fields.length,
          });
        last = now;
        requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
  for (const p of pages) await installPolicy(p);
  while (Date.now() - started < 240000) {
    const s = await pages[0].evaluate(() => window.__RUINWEAVERS__.getState());
    if (["victory", "defeat"].includes(s.trial.status)) {
      for (const p of pages) await release(p);
      await pages[0].waitForTimeout(650);
      await capture(pages[pages.length - 1], `${label}-${s.trial.status}`);
      const measurements = [];
      for (const p of pages)
        measurements.push(
          await p.evaluate(() => {
            const w = window as any;
            w.measureRun = false;
            const samples = w.runFrames.filter(
              (f: any) => f.status === "active",
            );
            const stats = (values: number[]) => {
              values.sort((a, b) => a - b);
              return {
                n: values.length,
                mean: values.reduce((a, b) => a + b, 0) / values.length,
                p50: values[Math.floor(values.length * 0.5)],
                p95: values[Math.floor(values.length * 0.95)],
                p99: values[Math.floor(values.length * 0.99)],
                max: values.at(-1),
              };
            };
            return {
              role: w.__RUINWEAVERS__.getNetworkState().role,
              frames: stats(samples.map((f: any) => f.ms)),
              rooms: [0, 1, 2, 3, 4].map((room) => ({
                room,
                frames: stats(
                  samples
                    .filter((f: any) => f.room === room)
                    .map((f: any) => f.ms),
                ),
                maxDraws: Math.max(
                  ...samples
                    .filter((f: any) => f.room === room)
                    .map((f: any) => f.draws),
                ),
              })),
              maxFields: Math.max(...samples.map((f: any) => f.fields)),
              render: w.__RUINWEAVERS__.getMetrics().render,
            };
          }),
        );
      const environment = await pages[0].evaluate(() => ({
        build: window.__RUINWEAVERS__.getNetworkState().build,
        browser: navigator.userAgent,
        viewport: [innerWidth, innerHeight],
        render: window.__RUINWEAVERS__.getMetrics().render,
      }));
      writeFileSync(
        `${dir}/${label}.json`,
        JSON.stringify(
          {
            environment,
            measurements,
            wallSeconds: (Date.now() - started) / 1000,
            combatSeconds: s.trial.elapsed,
            status: s.trial.status,
            results: s.trial.results,
            upgrades: s.run.upgrades,
            casts: s.metrics.casts,
            reactions: s.metrics.transformations,
            outcomes: s.metrics.outcomes,
            damageRoutes: s.metrics.damageRoutes,
            transport: await Promise.all(
              pages.map((p) =>
                p.evaluate(() =>
                  window.__RUINWEAVERS__.getNetworkDiagnostics(),
                ),
              ),
            ),
          },
          null,
          2,
        ),
      );
      expect(s.trial.status).toBe("victory");
      expect(rooms.size).toBe(5);
      expect(menus.size).toBe(3);
      for (const p of pages)
        await p.waitForFunction(
          () => window.__RUINWEAVERS__.getMetrics().render.courtResolved,
        );
      expect(s.trial.results).toHaveLength(5);
      for (const p of pages) {
        const remote = await p.evaluate(() =>
          window.__RUINWEAVERS__.getState(),
        );
        expect(
          remote.run.upgrades[
            remote.actors["mage-2"] && pages.indexOf(p) === 1
              ? "mage-2"
              : "mage-1"
          ],
        ).toHaveLength(3);
      }
      return;
    }
    if (s.trial.status === "between") {
      for (const p of pages) await release(p);
      for (const p of pages) {
        await p.waitForFunction(
          () => window.__RUINWEAVERS__.getState().trial.status === "between",
        );
        if (s.run.reward) {
          expect(
            await p.evaluate(() => {
              const api = window.__RUINWEAVERS__,
                state = api.getState();
              return state.run.reward.choices[api.getPlayerState().id];
            }),
          ).toBeUndefined();
          if (buildDirection) {
            const direction =
              buildDirection === "pair"
                ? pages.indexOf(p) === 1
                  ? "structure"
                  : "reaction"
                : buildDirection;
            const choice =
              buildChoices[direction][[0, 2, 3].indexOf(s.trial.encounter)];
            await p
              .locator(`#reward-cards button[data-upgrade="${choice}"]`)
              .click();
          } else await p.locator("#reward-cards button").first().click();
          await expect(p.locator("#reward-cards .chosen")).toBeVisible();
        }
      }
      if (s.run.reward && !menus.has(s.trial.encounter)) {
        menus.add(s.trial.encounter);
        await capture(
          pages[pages.length - 1],
          `${label}-reward-${s.trial.encounter + 1}`,
        );
      }
      for (const p of pages) await p.locator("#trial-action").click();
      await pages[0].waitForFunction(
        () => window.__RUINWEAVERS__.getState().trial.status === "active",
      );
    } else {
      if (
        buildDirection &&
        !actions.has(s.trial.encounter) &&
        s.time - s.trial.started > 2
      ) {
        actions.add(s.trial.encounter);
        if (s.trial.encounter === 4)
          await capture(
            pages.at(-1)!,
            `${label}-${buildDirection}-last-ward-combat`,
          );
      }
      if (!rooms.has(s.trial.encounter)) {
        expect(s.roomId).toBe(
          ["split", "gallery", "rotunda", "yard", "warden"][s.trial.encounter],
        );
        for (const p of pages)
          await p.waitForFunction(
            () => window.__RUINWEAVERS__.getMetrics().render.art.active,
          );
        rooms.add(s.trial.encounter);
        await capture(
          pages[pages.length - 1],
          `${label}-room-${s.trial.encounter + 1}`,
        );
      }
      for (const p of pages) await drive(p);
      await pages[0].waitForTimeout(75);
    }
  }
  throw Error("Run input journey timed out");
}
test("complete solo run through real combat inputs and personal reward cards", async ({
  page,
}) => {
  test.setTimeout(270000);
  await boot(page);
  await expect(page.locator("#panel")).toBeHidden();
  await page.locator("#trial-action").click();
  await complete([page], "solo");
  await page.locator("#trial-action").click();
  const s = await page.evaluate(() => window.__RUINWEAVERS__.getState());
  expect(s.run.upgrades["mage-1"]).toEqual([]);
  expect(s.trial.encounter).toBe(0);
});
test("complete two-client run with personal offers, waiting and synchronized restart", async ({
  browser,
}) => {
  test.setTimeout(290000);
  const ca = await browser.newContext(
      process.env.RUIN_RUN_VIDEO
        ? {
            recordVideo: {
              dir: `${dir}/raw`,
              size: { width: 1440, height: 900 },
            },
          }
        : {},
    ),
    cb = await browser.newContext(
      process.env.RUIN_RUN_VIDEO
        ? {
            recordVideo: {
              dir: `${dir}/raw`,
              size: { width: 1440, height: 900 },
            },
          }
        : {},
    ),
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
    for (const p of [a, b]) await p.locator("#trial-action").click();
    await complete([a, b], "coop");
    await a.locator("#trial-action").click();
    await b.waitForFunction(
      () => window.__RUINWEAVERS__.getState().trial.status === "ready",
    );
    await b.locator("#trial-action").click();
    for (const p of [a, b]) {
      await p.waitForFunction(
        () => window.__RUINWEAVERS__.getState().trial.status === "active",
      );
      expect(
        await p.evaluate(() => window.__RUINWEAVERS__.getState().run.upgrades),
      ).toEqual({ "mage-1": [], "mage-2": [] });
    }
  } finally {
    await ca.close();
    await cb.close();
  }
});
