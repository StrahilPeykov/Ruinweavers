import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const dir = "artifacts/run-0.1";
const primaryHeld = new WeakMap<Page, boolean>();
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
  await p.goto("/?quality=lightweight");
  await p.waitForFunction(() => !!window.__RUINWEAVERS__);
}
test("guest opening the default run can join an unchanged trial host", async ({
  browser,
}) => {
  const ca = await browser.newContext(),
    cb = await browser.newContext(),
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
  await p.evaluate(async () => {
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
  });
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
    const input = (window as any).runPolicy.input(fake);
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
  const menus = new Set<number>();
  for (const p of pages) await installPolicy(p);
  while (Date.now() - started < 240000) {
    const s = await pages[0].evaluate(() => window.__RUINWEAVERS__.getState());
    if (["victory", "defeat"].includes(s.trial.status)) {
      for (const p of pages) await release(p);
      await capture(pages[pages.length - 1], `${label}-${s.trial.status}`);
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
            wallSeconds: (Date.now() - started) / 1000,
            combatSeconds: s.trial.elapsed,
            status: s.trial.status,
            results: s.trial.results,
            upgrades: s.run.upgrades,
            casts: s.metrics.casts,
            reactions: s.metrics.transformations,
            damageRoutes: s.metrics.damageRoutes,
          },
          null,
          2,
        ),
      );
      expect(s.trial.status).toBe("victory");
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
        ).toHaveLength(2);
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
          await p.locator("#reward-cards button").first().click();
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
    for (const p of [a, b]) await p.locator("#trial-action").click();
    await complete([a, b], "coop");
    for (const p of [a, b]) await p.locator("#trial-action").click();
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
