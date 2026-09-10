import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const out =
  process.env.RUIN_SPATIAL_OUTPUT ??
  `artifacts/spatial-0.3/raw/browser-${Date.now()}`;
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
