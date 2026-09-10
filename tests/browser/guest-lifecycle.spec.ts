import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
test("guest keeps held W and LMB after a non-final enemy dies", async ({
  browser,
}) => {
  test.setTimeout(90000);
  const ca = await browser.newContext(),
    cb = await browser.newContext(),
    a = await ca.newPage(),
    b = await cb.newPage();
  try {
    for (const p of [a, b]) {
      await p.goto("/?scene=trial&quality=lightweight");
      await p.waitForFunction(() => !!window.__RUINWEAVERS__);
      await p.getByText("Connection options", { exact: true }).click();
      await p.locator("#signaling").selectOption("local");
    }
    await a.getByRole("button", { name: "Create co-op", exact: true }).click();
    await b
      .locator("#room-code")
      .fill(await a.locator("#room-code").inputValue());
    await b.getByRole("button", { name: "Join co-op", exact: true }).click();
    await b.waitForFunction(
      () => window.__RUINWEAVERS__.getNetworkState().status === "connected",
    );
    for (const p of [a, b])
      await p.getByRole("button", { name: "Ready", exact: true }).click();
    await a.waitForFunction(
      () => window.__RUINWEAVERS__.getState().trial.status === "active",
    );
    const target = await a.evaluate(() => {
      const api = window.__RUINWEAVERS__,
        s = api.getState(),
        enemy = s.entities.find((e: any) => e.ai);
      api.setPaused(true);
      api.setupTestState({
        enemyEnabled: false,
        entities: [
          { id: "mage-1", pos: { x: -7, y: 0.75, z: 5 } },
          { id: "mage-2", pos: { x: 0, y: 0.75, z: 5 } },
          { id: enemy.id, pos: { x: 0, y: 0.8, z: 0 }, hp: 8 },
        ],
      });
      api.setPaused(false);
      return enemy.id;
    });
    const epoch = await a.evaluate(
      () => window.__RUINWEAVERS__.getState().party.epoch,
    );
    await b.waitForFunction(
      (e) => window.__RUINWEAVERS__.getNetworkState().epoch === e,
      epoch,
    );
    await b.waitForTimeout(200);
    const point = await b.evaluate(() =>
      window.__RUINWEAVERS__.projectWorld({ x: 0, y: 0.8, z: 0 }),
    );
    await b.mouse.move(point.x, point.y);
    await b.keyboard.down("w");
    await b.mouse.down();
    await b.waitForFunction(
      (id) =>
        window.__RUINWEAVERS__.getState().entities.find((e: any) => e.id === id)
          .hp <= 0,
      target,
    );
    const before = await a.evaluate(() => ({
      p: window.__RUINWEAVERS__
        .getState()
        .entities.find((e: any) => e.id === "mage-2").pos,
      casts:
        window.__RUINWEAVERS__.getState().metrics.outcomes[
          "mage-2:cast:Ember:primary"
        ],
    }));
    await b.waitForTimeout(650);
    const after = await a.evaluate(() => window.__RUINWEAVERS__.getState());
    expect(after.trial.status).toBe("active");
    expect(after.entities.filter((e: any) => e.ai && e.hp > 0)).toHaveLength(1);
    expect(
      after.entities.find((e: any) => e.id === "mage-2").pos.z,
    ).toBeLessThan(before.p.z - 0.6);
    expect(after.metrics.outcomes["mage-2:cast:Ember:primary"]).toBeGreaterThan(
      before.casts,
    );
    await b.mouse.up();
    await b.keyboard.up("w");
    mkdirSync("artifacts/run-0.1", { recursive: true });
    await b.screenshot({ path: "artifacts/run-0.1/held-input.png" });
    writeFileSync(
      "artifacts/run-0.1/held-input.json",
      JSON.stringify(
        {
          build: await b.evaluate(
            () => window.__RUINWEAVERS__.getNetworkState().build,
          ),
          before,
          after: {
            pos: after.entities.find((e: any) => e.id === "mage-2").pos,
            casts: after.metrics.outcomes["mage-2:cast:Ember:primary"],
            status: after.trial.status,
          },
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
