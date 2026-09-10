const evidenceRoot = `test-results/evidence-usability.spec-${Date.now()}`;
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const state = (p: Page) => p.evaluate(() => window.__RUINWEAVERS__.getState());
async function boot(p: Page, scene = "free") {
  await p.goto(`/?scene=${scene}&quality=lightweight`);
  await p.waitForFunction(() => !!window.__RUINWEAVERS__);
}

test("browser shortcuts neither move nor cast and release held gameplay input", async ({
  page,
}) => {
  await boot(page);
  const before = await state(page);
  for (const modifier of ["Control", "Meta", "Alt"]) {
    await page.keyboard.down(modifier);
    await page.keyboard.down("a");
    await page.keyboard.press("f");
    await page.waitForTimeout(150);
    await page.keyboard.up("a");
    await page.keyboard.up(modifier);
  }
  const after = await state(page);
  expect(after.entities.find((e: any) => e.id === "mage-1").pos.x).toBeCloseTo(
    before.entities.find((e: any) => e.id === "mage-1").pos.x,
    3,
  );
  expect(after.metrics.casts).toEqual(before.metrics.casts);
  await page.keyboard.down("d");
  await page.waitForTimeout(150);
  await page.keyboard.down("Control");
  const stopped = await state(page);
  await page.waitForTimeout(200);
  expect(
    (await state(page)).entities.find((e: any) => e.id === "mage-1").pos.x,
  ).toBeCloseTo(stopped.entities.find((e: any) => e.id === "mage-1").pos.x, 3);
  await page.keyboard.up("d");
  await page.keyboard.up("Control");
  await page.keyboard.press("2");
  await page.keyboard.press("f");
  await expect.poll(async () => (await state(page)).fields.length).toBe(1);
});

test("mute, alternate bindings and optional wheel survive reload", async ({
  page,
}) => {
  await boot(page);
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await page.getByRole("button", { name: "Experiments", exact: true }).click();
  await page.getByText("Selected tunables", { exact: true }).click();
  await page.locator("#fallback").selectOption("KeyR");
  await page.locator("#cycle").selectOption("KeyC");
  await page.locator("#wheel").check();
  await page.reload();
  await page.waitForFunction(() => !!window.__RUINWEAVERS__);
  await expect(
    page.getByRole("button", { name: "Unmute", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    (await page.evaluate(() => window.__RUINWEAVERS__.getMetrics())).audio
      .muted,
  ).toBe(true);
  await page.getByRole("button", { name: "Experiments", exact: true }).click();
  await page.getByText("Selected tunables", { exact: true }).click();
  await expect(page.locator("#fallback")).toHaveValue("KeyR");
  await expect(page.locator("#cycle")).toHaveValue("KeyC");
  await expect(page.locator("#wheel")).toBeChecked();
  await page.locator("#close").click();
  await page.keyboard.press("c");
  await page.keyboard.press("r");
  await expect.poll(async () => (await state(page)).fields.length).toBe(1);
  expect((await state(page)).activePrinciple).toBe("Tide");
  await page.mouse.move(650, 450);
  await page.mouse.wheel(0, 200);
  await expect
    .poll(async () => (await state(page)).activePrinciple)
    .toBe("Gale");
});

test("Enter joins; both camera changes preserve party fields; rejection belongs to its caster", async ({
  browser,
}) => {
  test.setTimeout(90000);
  const hostContext = await browser.newContext(),
    guestContext = await browser.newContext();
  const a = await hostContext.newPage(),
    b = await guestContext.newPage();
  try {
    for (const p of [a, b]) {
      await boot(p, "trial");
      await p.getByText("Connection options", { exact: true }).click();
      await p.locator("#signaling").selectOption("local");
    }
    await a.getByRole("button", { name: "Create co-op", exact: true }).click();
    await b
      .locator("#room-code")
      .fill(await a.locator("#room-code").inputValue());
    await b.locator("#room-code").press("Enter");
    await b.waitForFunction(
      () => window.__RUINWEAVERS__.getNetworkState().status === "connected",
      undefined,
      { timeout: 8000 },
    );
    for (const p of [a, b])
      await p.getByRole("button", { name: "Ready", exact: true }).click();
    await a.waitForFunction(
      () => window.__RUINWEAVERS__.getState().trial.status === "active",
    );
    const setupEpoch = await a.evaluate(() => {
      const api = window.__RUINWEAVERS__;
      api.setPaused(true);
      api.setupTestState({ enemyEnabled: false });
      api.setPaused(false);
      return api.getState().party.epoch;
    });
    // Do not send guest combat intent against the pre-fixture epoch. Faster
    // native rendering exposes this setup race before the next snapshot arrives.
    await b.waitForFunction(
      (epoch) => window.__RUINWEAVERS__.getState().party.epoch === epoch,
      setupEpoch,
    );
    for (const p of [a, b]) {
      const at = await p.evaluate(() => {
        const api = window.__RUINWEAVERS__;
        const pos = api.getPlayerState().pos;
        return api.projectWorld({ x: pos.x, y: 0, z: pos.z - 2 });
      });
      await p.mouse.move(at.x, at.y);
      await p.keyboard.press(p === a ? "2" : "4");
      await p.keyboard.press("f");
      await expect
        .poll(async () =>
          (await state(a)).fields.some(
            (f: any) => f.source === (p === a ? "mage-1" : "mage-2"),
          ),
        )
        .toBe(true);
    }
    await a.waitForFunction(
      () => window.__RUINWEAVERS__.getState().fields.length === 2,
    );
    await a.evaluate(() => window.__RUINWEAVERS__.setPaused(true));
    await b.waitForFunction(
      () => window.__RUINWEAVERS__.getNetworkState().paused,
    );
    const fields = (await state(a)).fields;
    for (const p of [a, b]) {
      await p.getByRole("button", { name: "Experiments", exact: true }).click();
      await p.locator("#camera").selectOption("tactical");
      expect((await state(p)).fields).toEqual(fields);
      await p.locator("#close").click();
    }
    // Set up recovery, then reject a real host key press. Guest must not report it.
    await a.evaluate(() => {
      const api = window.__RUINWEAVERS__;
      api.setupTestState({ secondaryRemaining: 2 });
      api.setPaused(false);
    });
    await a.waitForFunction(
      () =>
        window.__RUINWEAVERS__.getNetworkState().epoch ===
        window.__RUINWEAVERS__.getState().party.epoch,
    );
    await a.keyboard.press("f");
    await a.waitForFunction(() =>
      window.__RUINWEAVERS__
        .getState()
        .events.some(
          (e: any) => e.type === "rejected" && e.source === "mage-1",
        ),
    );
    await a.evaluate(() => window.__RUINWEAVERS__.setPaused(true));
    await expect(a.locator("#cast-feedback")).toHaveText("Recovering");
    await expect(b.locator("#cast-feedback")).not.toHaveText("Recovering");
    mkdirSync(`${evidenceRoot}/usability`, { recursive: true });
    await b.screenshot({ path: `${evidenceRoot}/usability/guest-fields.png` });
    writeFileSync(
      `${evidenceRoot}/usability/guest-fields.json`,
      JSON.stringify(
        {
          build: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
          sourceHashes: Object.fromEntries(
            [
              "src/main.ts",
              "src/input/input.ts",
              "src/ui/ui.ts",
              "src/ui/cast-feedback.ts",
            ].map((path) => [
              path,
              createHash("sha256").update(readFileSync(path)).digest("hex"),
            ]),
          ),
          config: await b.evaluate(() =>
            window.__RUINWEAVERS__.getExperimentConfig(),
          ),
          host: await state(a),
          guest: await state(b),
          render: await b.evaluate(
            () => window.__RUINWEAVERS__.getMetrics().render,
          ),
        },
        null,
        2,
      ),
    );
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});
