import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const out =
  process.env.RUIN_SPATIAL_OUTPUT ??
  `artifacts/spatial-0.3/raw/browser-${Date.now()}`;
test("spatial handoff plans, real gameplay media and normal entry are directly usable", async ({
  page,
}) => {
  mkdirSync(out, { recursive: true });
  await page.goto("/spatial/index.html");
  await page.waitForFunction(() =>
    [...document.images].every((i) => i.complete && i.naturalWidth > 0),
  );
  await page
    .locator('img[alt="Eight room plans"]')
    .screenshot({ path: `${out}/candidate-plans.png` });
  for (const name of [
    "rotunda-field-trace",
    "rotunda-2-field-move",
    "gallery-1-base-corner",
  ])
    await page.locator(`img[src="${name}.svg"]`).screenshot({
      path: `${out}/${name}.png`,
    });
  await page.evaluate(() => {
    const v = document.querySelector("video")!;
    v.load();
  });
  await page.waitForFunction(() => {
    const v = document.querySelector("video")!;
    return v.readyState >= 2 && v.duration > 20;
  });
  for (const t of [3, 11, 20]) {
    await page.evaluate((t) => {
      document.querySelector("video")!.currentTime = t;
    }, t);
    await page.waitForFunction((t) => {
      const v = document.querySelector("video")!;
      return !v.seeking && Math.abs(v.currentTime - t) < 0.2;
    }, t);
    await page.locator("video").screenshot({ path: `${out}/clip-${t}s.png` });
  }
  await page
    .getByRole("link", { name: "Play the five-court run", exact: true })
    .click();
  await page.waitForFunction(
    () => window.__RUINWEAVERS__?.getState().roomId === "split",
  );
  await expect(page.locator("#panel")).toBeHidden();
});
test("selected illustrated rooms retain art and bounded repeated reset resources", async ({
  page,
}) => {
  test.setTimeout(120000);
  mkdirSync(out, { recursive: true });
  const evidence = [];
  for (const room of ["split", "gallery", "rotunda", "yard", "warden"]) {
    await page.goto(
      `/?scene=${room === "warden" ? "guardian" : "trial/mixed"}&room=${room}&art=illustrated&quality=lightweight&seed=123`,
    );
    await page.waitForFunction(
      () => window.__RUINWEAVERS__?.getMetrics().render.art.active,
    );
    await page.screenshot({ path: `${out}/${room}-illustrated.png` });
    const samples = [];
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.__RUINWEAVERS__.resetLab());
      await page.waitForTimeout(200);
      samples.push(
        await page.evaluate(() => {
          const m = window.__RUINWEAVERS__.getMetrics().render;
          return {
            geometries: m.geometries,
            textures: m.textures,
            drawCalls: m.drawCalls,
          };
        }),
      );
    }
    expect(samples.at(-1)!.geometries).toBeLessThanOrEqual(
      samples[1].geometries + 2,
    );
    expect(samples.at(-1)!.textures).toBeLessThanOrEqual(samples[1].textures);
    evidence.push({
      room,
      samples,
      render: await page.evaluate(
        () => window.__RUINWEAVERS__.getMetrics().render,
      ),
    });
  }
  writeFileSync(
    `${out}/illustrated-resets.json`,
    JSON.stringify(evidence, null, 2),
  );
  await page.evaluate(() =>
    window.__RUINWEAVERS__.setExperimentConfig({ room: "split" }),
  );
  expect(
    await page.evaluate(() => window.__RUINWEAVERS__.getState().roomId),
  ).toBe("split");
});
test("two clients share the rotunda and the guest can take an alternate route to revive", async ({
  browser,
}) => {
  test.setTimeout(60000);
  mkdirSync(out, { recursive: true });
  const ca = await browser.newContext(),
    cb = await browser.newContext();
  const a = await ca.newPage(),
    b = await cb.newPage();
  try {
    for (const p of [a, b]) {
      await p.goto(
        "/?scene=trial/mixed&room=rotunda&art=illustrated&quality=lightweight",
      );
      await p.waitForFunction(() => !!window.__RUINWEAVERS__);
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
    await b.waitForFunction(
      () => window.__RUINWEAVERS__.getState().trial.status === "active",
    );
    await a.evaluate(() => {
      const api = window.__RUINWEAVERS__,
        s = api.getState();
      api.setPaused(true);
      api.setupTestState({
        enemyEnabled: false,
        entities: [
          { id: "mage-1", hp: 0, pos: { x: 7, y: 0.75, z: 0 } },
          { id: "mage-2", pos: { x: -7, y: 0.75, z: 0 } },
          ...s.entities
            .filter((e: any) => e.ai)
            .map((e: any, i: number) => ({
              id: e.id,
              pos: { x: -3 + i * 2, y: 0.8, z: -9 },
            })),
        ],
      });
      api.setPaused(false);
    });
    await b.waitForFunction(
      () => window.__RUINWEAVERS__.getPlayerState().pos.x < -6,
    );
    for (const [x, z] of [
      [-7, -5],
      [7, -5],
      [7, 0],
    ]) {
      const until = Date.now() + 10000;
      let reached = false;
      while (Date.now() < until) {
        const p = await b.evaluate(
          () => window.__RUINWEAVERS__.getPlayerState().pos,
        );
        const dx = x - p.x,
          dz = z - p.z;
        if (Math.hypot(dx, dz) < 0.6) {
          reached = true;
          break;
        }
        for (const [k, down] of [
          ["a", dx < -0.25],
          ["d", dx > 0.25],
          ["w", dz < -0.25],
          ["s", dz > 0.25],
        ] as const) {
          if (down) await b.keyboard.down(k);
          else await b.keyboard.up(k);
        }
        await b.waitForTimeout(60);
      }
      for (const k of ["a", "d", "w", "s"]) await b.keyboard.up(k);
      expect(reached).toBe(true);
    }
    await b.keyboard.down("e");
    await a.waitForFunction(
      () => window.__RUINWEAVERS__.getPlayerState().hp > 0,
    );
    await b.keyboard.up("e");
    // Host completion precedes delivery of the same revive to the guest.
    await b.waitForFunction(
      () =>
        window.__RUINWEAVERS__
          .getState()
          .entities.find((e: any) => e.id === "mage-1").hp > 0,
    );
    const state = await b.evaluate(() => window.__RUINWEAVERS__.getState());
    expect(state.roomId).toBe("rotunda");
    expect(state.entities.find((e: any) => e.id === "mage-1").hp).toBe(35);

    await b.screenshot({ path: `${out}/rotunda-coop-revive-fixture.png` });
    writeFileSync(
      `${out}/rotunda-coop-route.json`,
      JSON.stringify(
        {
          fixture:
            "Enemies alive but disabled and repositioned; host downed across central masonry. Guest movement and revive use real keyboard via actual local WebRTC.",
          room: state.roomId,
          player: state.entities
            .filter((e: any) => e.kind === "player")
            .map((e: any) => ({ id: e.id, pos: e.pos, hp: e.hp })),
          network: await b.evaluate(() =>
            window.__RUINWEAVERS__.getNetworkDiagnostics(),
          ),
        },
        null,
        2,
      ),
    );
  } finally {
    await ca.close();
    await cb.close();
  }
});
test("candidate greyboxes: actual movement, independent aim, casting and reset", async ({
  page,
}) => {
  test.setTimeout(150000);
  mkdirSync(out, { recursive: true });
  const evidence = [];
  for (const room of [
    "split",
    "gallery",
    "rotunda",
    "terrace",
    "broken",
    "yard",
    "warden",
    "archive",
  ]) {
    await page.goto(
      `/?scene=${room === "warden" ? "guardian" : "trial/mixed"}&room=${room}&art=off&quality=lightweight&seed=123`,
    );
    await page.waitForFunction(() => !!window.__RUINWEAVERS__);
    const before = await page.evaluate(() =>
      window.__RUINWEAVERS__.getPlayerState(),
    );
    await page.locator("#trial-action").click();
    await page.keyboard.down("d");
    const point = await page.evaluate(() => {
      const api = window.__RUINWEAVERS__,
        e = api.getState().entities.find((e: any) => e.ai && e.hp > 0);
      return api.projectWorld(e.pos);
    });
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.keyboard.press("Space");
    await page.keyboard.up("d");
    await page.mouse.up();
    await page.keyboard.press("2");
    await page.keyboard.press("f");
    await page.waitForTimeout(400);
    const state = await page.evaluate(() => window.__RUINWEAVERS__.getState());
    expect(state.roomId).toBe(room);
    expect(
      Math.hypot(
        state.entities[0].pos.x - before.pos.x,
        state.entities[0].pos.z - before.pos.z,
      ),
    ).toBeGreaterThan(0.5);
    expect(state.metrics.casts["Ember:primary"]).toBeGreaterThan(0);
    await page.screenshot({ path: `${out}/${room}-greybox.png` });
    evidence.push({
      room,
      build: await page.evaluate(
        () => window.__RUINWEAVERS__.getNetworkState().build,
      ),
      casts: state.metrics.casts,
      falls: state.metrics.falls,
      player: state.entities[0].pos,
    });
    await page.evaluate(() => window.__RUINWEAVERS__.resetLab());
    expect(
      await page.evaluate(() => window.__RUINWEAVERS__.getState().roomId),
    ).toBe(room);
  }
  writeFileSync(
    `${out}/greybox-inputs.json`,
    JSON.stringify(
      {
        note: "Short normal-input layout smoke; concurrent simulation evaluation, no frame claims",
        evidence,
      },
      null,
      2,
    ),
  );
});
