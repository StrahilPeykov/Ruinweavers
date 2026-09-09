import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const signaling = process.env.RUIN_SIGNALING ?? "local";
const dir = `artifacts/coop-trial/browser/${signaling}`;
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
      await p.evaluate(async () => ({
        state: window.__RUINWEAVERS__.getState(),
        network: window.__RUINWEAVERS__.getNetworkState(),
        metrics: window.__RUINWEAVERS__.getMetrics(),
        rtc: await window.__RUINWEAVERS__.getRtcStats(),
        browser: navigator.userAgent,
        viewport: { w: innerWidth, h: innerHeight },
      })),
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
      window.__RUINWEAVERS__.getNetworkState().epoch === e &&
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
  await capture(b, "06-synthetic-delay");
  await b.getByRole("button", { name: "Leave co-op", exact: true }).click();
  await a.waitForFunction(
    () => window.__RUINWEAVERS__.getNetworkState().status === "failed",
  );
  await capture(a, "07-disconnected");
  await ca.close();
  await cb.close();
});
