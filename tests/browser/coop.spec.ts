import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
const signaling = process.env.RUIN_SIGNALING ?? "local";
const dir =
  process.env.RUIN_COOP_ARTIFACTS ??
  `artifacts/coop-trial/browser/${signaling}`;
const state = (p: Page) => p.evaluate(() => window.__RUINWEAVERS__.getState());
async function ready(p: Page) {
  await p.goto("/?scene=trial&scenario=open-near");
  await p.waitForFunction(() => !!window.__RUINWEAVERS__);
  await p.getByText("Connection options", { exact: true }).click();
  await p.locator("#signaling").selectOption(signaling);
}
async function connect(a: Page, b: Page) {
  await ready(a);
  await ready(b);
  await a.getByRole("button", { name: "Create co-op", exact: true }).click();
  const code = await a.locator("#room-code").inputValue();
  await b.locator("#room-code").fill(code);
  await b.getByRole("button", { name: "Join co-op", exact: true }).click();
  for (const p of [a, b])
    await p.waitForFunction(
      () => window.__RUINWEAVERS__.getNetworkState().status === "connected",
      undefined,
      { timeout: 20000 },
    );
}
async function capture(p: Page, name: string) {
  mkdirSync(dir, { recursive: true });
  await p.screenshot({ path: `${dir}/${name}.png` });
  writeFileSync(
    `${dir}/${name}.json`,
    JSON.stringify(
      {
        build: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
        sourceHashes: Object.fromEntries(
          [
            "src/network/session.ts",
            "src/simulation/simulation.ts",
            "src/render/view.ts",
          ].map((f) => [
            f,
            createHash("sha256").update(readFileSync(f)).digest("hex"),
          ]),
        ),
        ...(await p.evaluate(async () => ({
          config: window.__RUINWEAVERS__.getExperimentConfig(),
          renderer: (() => {
            const gl = document.querySelector("canvas")!.getContext("webgl2")!;
            const ext = gl.getExtension("WEBGL_debug_renderer_info");
            return ext
              ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
              : "unknown";
          })(),
          state: window.__RUINWEAVERS__.getState(),
          network: window.__RUINWEAVERS__.getNetworkState(),
          metrics: window.__RUINWEAVERS__.getMetrics(),
          rtc: await window.__RUINWEAVERS__.getRtcStats(),
          browser: navigator.userAgent,
          viewport: { w: innerWidth, h: innerHeight },
        }))),
      },
      null,
      2,
    ),
  );
}
test("two real WebRTC clients have independent actors and cameras", async ({
  browser,
}) => {
  test.setTimeout(90000);
  const ca = await browser.newContext(),
    cb = await browser.newContext(),
    a = await ca.newPage(),
    b = await cb.newPage();
  const errors: string[] = [];
  a.on("pageerror", (e) => errors.push(e.message));
  b.on("pageerror", (e) => errors.push(e.message));
  await connect(a, b);
  await capture(a, "01-host-lobby");
  await capture(b, "02-guest-lobby");
  expect(
    await b.evaluate(() => window.__RUINWEAVERS__.getPlayerState().id),
  ).toBe("mage-2");
  await a.getByRole("button", { name: "Ready", exact: true }).click();
  expect((await state(a)).trial.status).toBe("ready");
  await b.getByRole("button", { name: "Ready", exact: true }).click();
  for (const p of [a, b])
    await p.waitForFunction(
      () => window.__RUINWEAVERS__.getState().trial.status === "active",
    );
  await a.keyboard.down("a");
  await b.keyboard.down("d");
  await b.keyboard.press("3");
  await b.keyboard.down("j");
  await b.waitForTimeout(500);
  await a.keyboard.up("a");
  await b.keyboard.up("d");
  await b.keyboard.up("j");
  await a.waitForFunction(
    () =>
      window.__RUINWEAVERS__.getState().actors["mage-2"].activePrinciple ===
      "Gale",
    undefined,
    { timeout: 5000 },
  );
  const s = await state(a);
  expect(s.actors["mage-1"].activePrinciple).toBe("Ember");
  expect(s.entities.find((e: any) => e.id === "mage-1").pos.x).toBeLessThan(
    -1.2,
  );
  expect(s.entities.find((e: any) => e.id === "mage-2").pos.x).toBeGreaterThan(
    1.2,
  );
  expect(s.metrics.outcomes["mage-2:cast:Gale:primary"]).toBeGreaterThan(0);
  await b.getByRole("button", { name: "Experiments", exact: true }).click();
  await b.locator("#quality").selectOption("lightweight");
  expect(
    (await a.evaluate(() => window.__RUINWEAVERS__.getMetrics())).render
      .quality,
  ).toBe("standard");
  const guestDiagnostics = await b.evaluate(() =>
    window.__RUINWEAVERS__.getNetworkDiagnostics(),
  );
  expect(guestDiagnostics.role).toBe("guest");
  expect(guestDiagnostics.snapshotIntervals.samples).toBeGreaterThan(0);
  expect(guestDiagnostics.snapshotApply.samples).toBeGreaterThan(0);
  expect(
    guestDiagnostics.paths.some((p: any) => p.selected && p.bytesReceived > 0),
  ).toBe(true);
  expect(JSON.stringify(guestDiagnostics)).not.toMatch(
    /username|credential|address|turn:/,
  );
  await b.locator("#close").click();
  await capture(a, "03-host-play");
  await capture(b, "04-guest-play");
  expect(errors).toEqual([]);
  await ca.close();
  await cb.close();
});

async function start(a: Page, b: Page) {
  for (const p of [a, b])
    await p.getByRole("button", { name: "Ready", exact: true }).click();
  for (const p of [a, b])
    await p.waitForFunction(
      () => window.__RUINWEAVERS__.getState().trial.status === "active",
    );
}
async function arrange(a: Page, b: Page, patch: any) {
  await a.evaluate((p) => {
    const api = window.__RUINWEAVERS__;
    api.setPaused(true);
    api.setupTestState(p);
    api.setPaused(false);
  }, patch);
  const epoch = await a.evaluate(
    () => window.__RUINWEAVERS__.getState().party.epoch,
  );
  await b.waitForFunction(
    (e) =>
      window.__RUINWEAVERS__.getNetworkState().epoch >= e &&
      !window.__RUINWEAVERS__.getNetworkState().paused,
    epoch,
  );
}
async function aim(p: Page, pos: any) {
  const at = await p.evaluate(
    (pos) => window.__RUINWEAVERS__.projectWorld(pos),
    pos,
  );
  await p.mouse.move(at.x, at.y);
}
test("co-op fields, cross-player reaction, allied safety, stale inputs and delayed WebRTC", async ({
  browser,
}) => {
  test.setTimeout(120000);
  const ca = await browser.newContext(),
    cb = await browser.newContext(),
    a = await ca.newPage(),
    b = await cb.newPage();
  await connect(a, b);
  await start(a, b);
  const ids = (await state(a)).entities
    .filter((e: any) => e.ai)
    .map((e: any) => e.id);
  await arrange(a, b, {
    enemyEnabled: false,
    entities: [
      { id: "mage-1", pos: { x: -2, y: 0.75, z: 4 } },
      { id: "mage-2", pos: { x: 2, y: 0.75, z: 4 } },
      { id: ids[0], pos: { x: 0, y: 0.8, z: -1 }, wet: 0, heat: 0 },
    ],
  });
  await a.keyboard.press("2");
  await aim(a, { x: 0, y: 0, z: -1 });
  await a.mouse.down({ button: "right" });
  await a.mouse.up({ button: "right" });
  await a.waitForFunction(() =>
    window.__RUINWEAVERS__
      .getState()
      .fields.some((f: any) => f.source === "mage-1"),
  );
  await b.keyboard.press("4");
  await aim(b, { x: 6, y: 0, z: -3 });
  await b.keyboard.press("f");
  await a.waitForFunction(() =>
    window.__RUINWEAVERS__
      .getState()
      .fields.some((f: any) => f.source === "mage-2"),
  );
  const slab = (await state(a)).fields.find(
    (f: any) => f.source === "mage-2",
  ).id;
  await b.keyboard.press("1");
  await aim(b, (await state(a)).entities.find((e: any) => e.id === ids[0]).pos);
  await b.mouse.down();
  await b.waitForTimeout(1000);
  await b.mouse.up();
  await a.waitForFunction(() =>
    Object.keys(window.__RUINWEAVERS__.getState().metrics.outcomes).some((k) =>
      k.startsWith("cross-reaction:mage-1:mage-2:encounter-"),
    ),
  );
  await a.keyboard.press("3");
  await aim(a, { x: -3, y: 0, z: 1 });
  await a.keyboard.press("f");
  await a.waitForFunction(() =>
    window.__RUINWEAVERS__
      .getState()
      .fields.some((f: any) => f.source === "mage-1" && f.principle === "Gale"),
  );
  expect((await state(a)).fields.some((f: any) => f.id === slab)).toBe(true);
  expect(
    (await state(a)).entities.find((e: any) => e.id === ids[0]).wet,
  ).toBeGreaterThan(0);
  await b.keyboard.press("Space");
  await a.waitForFunction(
    () => window.__RUINWEAVERS__.getState().actors["mage-2"].dodgeReady > 0,
  );
  expect((await state(a)).actors["mage-1"].dodgeReady).toBe(0);
  await arrange(a, b, {
    entities: [
      { id: "mage-1", pos: { x: -2, y: 0.75, z: 4 }, wet: 0, heat: 0 },
      { id: "mage-2", pos: { x: 2, y: 0.75, z: 4 } },
    ],
  });
  await b.keyboard.press("1");
  await aim(b, { x: -2, y: 0.75, z: 4 });
  await b.keyboard.down("j");
  await b.waitForTimeout(800);
  await b.keyboard.up("j");
  await a.waitForFunction(() =>
    Object.keys(window.__RUINWEAVERS__.getState().metrics.outcomes).some((k) =>
      k.startsWith("allied-damage-suppressed:mage-2:mage-1"),
    ),
  );
  expect((await state(a)).entities.find((e: any) => e.id === "mage-1").hp).toBe(
    100,
  );
  await capture(a, "05-shared-magic");
  // Real keyboard hold, then intentionally suppress outgoing input packets. The transport remains WebRTC.
  await b.keyboard.down("d");
  await b.keyboard.down("j");
  await b.waitForTimeout(150);
  await b.evaluate(() => window.__RUINWEAVERS__.silenceNetworkInput(1800));
  await a.waitForFunction(
    () => window.__RUINWEAVERS__.getNetworkState().remoteStale === true,
  );
  const frozen = (await state(a)).entities.find(
    (e: any) => e.id === "mage-2",
  ).pos;
  await b.waitForTimeout(200);
  expect(
    (await state(a)).entities.find((e: any) => e.id === "mage-2").pos.x,
  ).toBeCloseTo(frozen.x, 2);
  await b.keyboard.up("d");
  await b.keyboard.up("j");
  await b.evaluate(() => window.dispatchEvent(new Event("blur")));
  for (const p of [a, b])
    await p.evaluate(() =>
      window.__RUINWEAVERS__.setNetworkProfile({
        delayMs: 80,
        jitterMs: 20,
        seed: 42,
      }),
    );
  await b.evaluate(() => window.__RUINWEAVERS__.silenceNetworkInput(0));
  await b.keyboard.press("2");
  await a.waitForFunction(
    () =>
      window.__RUINWEAVERS__.getState().actors["mage-2"].activePrinciple ===
      "Tide",
  );
  await a.evaluate(() => window.__RUINWEAVERS__.setPaused(true));
  await b.waitForFunction(
    () => window.__RUINWEAVERS__.getNetworkState().paused,
  );
  const authority = await state(a),
    replica = await state(b);
  expect(replica.entities).toEqual(authority.entities);
  expect(replica.fields).toEqual(authority.fields);
  expect(replica.metrics.damageRoutes).toEqual({});
  expect(replica.events).toEqual(authority.events);
  await capture(b, "06-synthetic-delay");
  await b.getByRole("button", { name: "Leave co-op", exact: true }).click();
  await a.waitForFunction(
    () => window.__RUINWEAVERS__.getNetworkState().status === "failed",
  );
  await capture(a, "07-disconnected");
  await ca.close();
  await cb.close();
});

test("hostile targeting, revive and synchronized three-encounter lifecycle", async ({
  browser,
}) => {
  test.setTimeout(150000);
  const ca = await browser.newContext(),
    cb = await browser.newContext(),
    a = await ca.newPage(),
    b = await cb.newPage();
  await connect(a, b);
  await start(a, b);
  let enemies = (await state(a)).entities.filter((e: any) => e.ai);
  await arrange(a, b, {
    enemyEnabled: false,
    entities: [
      { id: "mage-1", pos: { x: 6, y: 0.75, z: 5 }, hp: 80 },
      { id: "mage-2", pos: { x: 0, y: 0.75, z: 3 }, hp: 1 },
      { id: enemies[0].id, pos: { x: 0, y: 0.8, z: -3 }, aiEnabled: true },
    ],
  });
  await a.waitForFunction(() =>
    window.__RUINWEAVERS__
      .getState()
      .entities.some((e: any) => e.ai?.targetId === "mage-2"),
  );
  await a.waitForFunction(
    () =>
      window.__RUINWEAVERS__
        .getState()
        .entities.find((e: any) => e.id === "mage-2").hp === 0,
    undefined,
    { timeout: 15000 },
  );
  await arrange(a, b, {
    enemyEnabled: false,
    entities: [{ id: "mage-1", pos: { x: 1, y: 0.75, z: 3 } }],
  });
  await a.waitForFunction(() =>
    window.__RUINWEAVERS__
      .getState()
      .entities.some((e: any) => e.ai?.targetId === "mage-1"),
  );
  await capture(b, "08-downed-guest");
  await a.keyboard.down("e");
  await a.waitForFunction(
    () =>
      window.__RUINWEAVERS__
        .getState()
        .entities.find((e: any) => e.id === "mage-2").hp === 35,
  );
  await a.keyboard.up("e");
  await capture(a, "09-revived");
  for (let stage = 0; stage < 3; stage++) {
    enemies = (await state(a)).entities.filter((e: any) => e.ai);
    // Reduced-health lifecycle fixture: one actual keyboard cast ends each encounter.
    await arrange(a, b, {
      enemyEnabled: false,
      entities: [
        { id: "mage-1", pos: { x: 0, y: 0.75, z: 4 }, wet: 0, heat: 0 },
        { id: "mage-2", pos: { x: 3, y: 0.75, z: 4 }, hp: 0 },
        ...enemies.map((e: any, i: number) => ({
          id: e.id,
          hp: i === 0 ? 1 : 0,
          pos: { x: 0, y: e.height / 2, z: 0 },
        })),
      ],
    });
    await a.keyboard.press("1");
    await aim(a, { x: 0, y: 0.8, z: 0 });
    await a.keyboard.down("j");
    await a.waitForFunction(
      () => window.__RUINWEAVERS__.getState().trial.status !== "active",
    );
    await a.keyboard.up("j");
    await b.waitForFunction(
      () => window.__RUINWEAVERS__.getState().trial.status !== "active",
    );
    expect(
      (await state(a)).entities.find((e: any) => e.id === "mage-2").hp,
    ).toBe(35);
    expect(
      (await state(a)).entities.find((e: any) => e.id === "mage-1").hp,
    ).toBe(80);
    expect((await state(a)).trial.status).toBe(
      stage === 2 ? "victory" : "between",
    );
    if (stage < 2) {
      await a.getByRole("button", { name: "Ready", exact: true }).click();
      expect((await state(a)).trial.status).toBe("between");
      await b.getByRole("button", { name: "Ready", exact: true }).click();
      for (const p of [a, b])
        await p.waitForFunction(
          () => window.__RUINWEAVERS__.getState().trial.status === "active",
        );
    }
  }
  await capture(b, "10-victory-lifecycle-fixture");
  await start(a, b);
  expect(
    (await state(a)).entities
      .filter((e: any) => e.kind === "player")
      .map((e: any) => e.hp),
  ).toEqual([100, 100]);
  expect((await state(a)).events.some((e: any) => e.type === "steam")).toBe(
    false,
  );
  await arrange(a, b, {
    entities: [
      { id: "mage-1", hp: 0 },
      { id: "mage-2", hp: 0 },
    ],
  });
  for (const p of [a, b])
    await p.waitForFunction(
      () => window.__RUINWEAVERS__.getState().trial.status === "defeat",
    );
  await capture(a, "11-both-down-fixture");
  await start(a, b);
  expect((await state(a)).trial.encounter).toBe(0);
  await ca.close();
  await cb.close();
});

test("shared Stone cover and guest Gale deflection are authoritative once", async ({
  browser,
}) => {
  test.setTimeout(90000);
  const ca = await browser.newContext(),
    cb = await browser.newContext(),
    a = await ca.newPage(),
    b = await cb.newPage();
  await connect(a, b);
  await start(a, b);
  const enemies = (await state(a)).entities.filter((e: any) => e.ai);
  await arrange(a, b, {
    enemyEnabled: false,
    entities: [
      { id: "mage-1", pos: { x: -1, y: 0.75, z: 4 } },
      { id: "mage-2", pos: { x: 0, y: 0.75, z: 4 } },
      { id: enemies[0].id, pos: { x: 0, y: 0.8, z: -4 }, aiEnabled: true },
    ],
  });
  await a.keyboard.press("4");
  await aim(a, { x: 0, y: 0, z: 0 });
  await a.keyboard.press("f");
  await a.waitForFunction(
    () => window.__RUINWEAVERS__.getState().metrics.blockedBolts > 0,
    undefined,
    { timeout: 15000 },
  );
  expect((await state(a)).entities.find((e: any) => e.id === "mage-2").hp).toBe(
    100,
  );
  await capture(b, "12-partner-cover");
  // Replace host cover well outside the firing lane. Guest repels actual enemy projectiles.
  await a.keyboard.press("2");
  await aim(a, { x: -5, y: 0, z: 3 });
  await a.keyboard.press("f");
  await b.keyboard.press("3");
  await aim(b, { x: 0, y: 0.8, z: -4 });
  await b.keyboard.down("j");
  await a.waitForFunction(
    () => window.__RUINWEAVERS__.getState().metrics.transformations.deflect > 0,
    undefined,
    { timeout: 15000 },
  );
  await b.keyboard.up("j");
  await a.evaluate(() => window.__RUINWEAVERS__.setPaused(true));
  await b.waitForFunction(
    () => window.__RUINWEAVERS__.getNetworkState().paused,
  );
  const host = await state(a),
    guest = await state(b);
  expect(guest.tick).toBe(host.tick);
  expect(guest.entities).toEqual(host.entities);
  expect(guest.metrics.damageRoutes).toEqual({});
  expect(guest.fields).toEqual(host.fields);
  expect(guest.events).toEqual(host.events);
  expect(new Set(guest.events.map((e: any) => e.id)).size).toBe(
    guest.events.length,
  );
  expect(
    Object.keys(host.metrics.outcomes).some((k) =>
      k.includes(enemies[0].id + ":deflected"),
    ),
  ).toBe(true);
  await capture(b, "13-shared-projectile");
  await ca.close();
  await cb.close();
});

test("missing room times out cleanly and can return to solo", async ({
  page,
}) => {
  test.setTimeout(45000);
  await ready(page);
  await page.locator("#room-code").fill("RW-NOMATCH12345");
  // Complete 12-character room suffix, with no host on this signaling relay.
  await page.locator("#room-code").fill("RW-NOMATCH123456");
  await page.getByRole("button", { name: "Join co-op", exact: true }).click();
  await page.waitForFunction(
    () => window.__RUINWEAVERS__.getNetworkState().status === "failed",
    undefined,
    { timeout: 30000 },
  );
  await expect(page.locator("#room-status")).toContainText("25 seconds");
  await capture(page, "14-connection-timeout");
  await page
    .getByRole("button", { name: "Return to solo", exact: true })
    .click();
  await page.getByRole("button", { name: "Start trial", exact: true }).click();
  expect((await state(page)).trial.status).toBe("active");
  expect(Object.keys((await state(page)).actors)).toEqual(["mage-1"]);
});
