const evidenceRoot = `test-results/evidence-art-motion.spec-${Date.now()}`;
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const finish = process.env.RUIN_ART_FINISH === "1";
const dir = finish
  ? `${evidenceRoot}/art-finish/motion`
  : `${evidenceRoot}/art-proof/motion`;
// Keep reviewable visual evidence; full diagnostic histories stay local/on demand.
const compactState = (s: any) =>
  s && {
    time: s.time,
    tick: s.tick,
    trial: s.trial,
    run: s.run,
    party: s.party,
    actors: s.actors,
    entities: s.entities.map((e: any) => ({
      id: e.id,
      kind: e.kind,
      pos: e.pos,
      hp: e.hp,
      wet: e.wet,
      heat: e.heat,
      burning: e.burning,
      cohesion: e.cohesion,
    })),
    fields: s.fields,
    bolts: s.bolts,
    metrics: s.metrics,
    recentEvents: s.events.slice(-8),
  };
const state = (p: Page) => p.evaluate(() => window.__RUINWEAVERS__.getState());
async function aim(p: Page, x: number, z: number, y = 0) {
  const point = await p.evaluate(
    (v) => window.__RUINWEAVERS__.projectWorld(v),
    { x, y, z },
  );
  await p.mouse.move(point.x, point.y);
}
async function ready(pages: Page[]) {
  for (const p of pages) await p.locator("#trial-action").click();
  for (const p of pages)
    await p.waitForFunction(
      () => window.__RUINWEAVERS__.getState().trial.status === "active",
    );
}
async function clearFixture(a: Page, b: Page) {
  await a.evaluate(() => {
    const api = window.__RUINWEAVERS__;
    api.setPaused(true);
    api.setupTestState({
      entities: api
        .getState()
        .entities.filter((e: any) => e.ai)
        .map((e: any) => ({ id: e.id, hp: 0 })),
    });
    api.setPaused(false);
  });
  for (const p of [a, b])
    await p.waitForFunction(
      () => window.__RUINWEAVERS__.getState().trial.status === "between",
    );
}
async function fixture(a: Page, b: Page, entities: any[], enabled = false) {
  await a.evaluate(
    ({ entities, enabled }) => {
      const api = window.__RUINWEAVERS__;
      api.setPaused(true);
      api.setupTestState({ enemyEnabled: enabled, entities });
      api.setPaused(false);
    },
    { entities, enabled },
  );
  const epoch = (await state(a)).party.epoch;
  await b.waitForFunction(
    (epoch) => window.__RUINWEAVERS__.getState().party.epoch === epoch,
    epoch,
  );
  // Fixture teleports intentionally reset prediction; wait for the unchanged
  // camera follow to settle before translating a world target to pointer pixels.
  await b.waitForTimeout(600);
}

for (const art of finish ? ["storybook", "illustrated"] : ["storybook", "ink"])
  for (const loadout of ["flow-echo", "capacity-tether"])
    test(`${art} paired motion: ${loadout}`, async ({ browser }) => {
      test.setTimeout(120000);
      mkdirSync(`${dir}/raw`, { recursive: true });
      const ca = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          recordVideo: {
            dir: "test-results/art-video",
            size: { width: 1440, height: 900 },
          },
        }),
        cb = await browser.newContext({
          viewport: { width: 1440, height: 900 },
        });
      const a = await ca.newPage(),
        b = await cb.newPage(),
        video = a.video()!,
        started = Date.now(),
        marks: Record<string, number> = {},
        errors: string[] = [];
      for (const p of [a, b]) p.on("pageerror", (e) => errors.push(e.message));
      const evidence: any = {
        art,
        loadout,
        fixture:
          "Existing run reward/encounter lifecycle reached with labelled HP fixtures; measured sequence uses real browser controls and real simulation/physics. Same seed/layout/actors/actions for A and B.",
        captures: [],
      };
      async function capture(name: string) {
        marks[name] = (Date.now() - started) / 1000;
        await a.screenshot({ path: `${dir}/${art}-${loadout}-${name}.png` });
        evidence.captures.push({
          name,
          at: marks[name],
          ...(await a.evaluate(() => ({
            build: window.__RUINWEAVERS__.getNetworkState().build,
            config: window.__RUINWEAVERS__.getExperimentConfig(),
            state: window.__RUINWEAVERS__.getState(),
            render: window.__RUINWEAVERS__.getMetrics().render,
          }))),
          guest: await b.evaluate(
            () => window.__RUINWEAVERS__.getMetrics().render,
          ),
        });
      }
      try {
        for (const p of [a, b]) {
          // Expanded pool: seed 156 offers the same original alterations to each actor.
          await p.goto(`/?scene=run&art=${art}&quality=lightweight&seed=156`);
          await p.waitForFunction(() => !!window.__RUINWEAVERS__);
          if (finish) await p.addStyleTag({ content: "h1{display:none}" });
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
        await ready([a, b]);
        await clearFixture(a, b);
        const choices =
          loadout === "flow-echo"
            ? ["Travelling basin", "Stone remembers"]
            : ["Double inscription", "Tethered updraft"];
        for (const [i, p] of [a, b].entries())
          await p
            .locator("#reward-cards button")
            .filter({ hasText: choices[i] })
            .click();
        await ready([a, b]);
        await clearFixture(a, b);
        await ready([a, b]);
        expect((await state(a)).trial.encounter).toBe(2);
        await fixture(a, b, [
          { id: "mage-1", pos: { x: -7, y: 0.75, z: 5 } },
          { id: "mage-2", pos: { x: -5, y: 0.75, z: 5 } },
        ]);
        marks.sequence = (Date.now() - started) / 1000;
        for (const p of [a, b]) await p.keyboard.press("1");
        await capture("identity");
        if (finish) {
          await a.waitForFunction(() =>
            Object.values(window.__RUINWEAVERS__.getState().actors).every(
              (a: any) => a.activePrinciple === "Ember",
            ),
          );
          await aim(a, -9, 0);
          await aim(b, -3, 0);
          for (const p of [a, b]) await p.keyboard.down("j");
          await a.waitForTimeout(180);
          await capture("same-principle");
          for (const p of [a, b]) await p.keyboard.up("j");
        }
        await a.keyboard.press("2");
        await aim(a, -7, 1);
        await a.keyboard.press("f");
        await a.waitForFunction(() =>
          window.__RUINWEAVERS__
            .getState()
            .fields.some(
              (f: any) => f.source === "mage-1" && f.principle === "Tide",
            ),
        );
        const fieldBefore = (await state(a)).fields.find(
          (f: any) => f.source === "mage-1",
        );
        await b.keyboard.press("1");
        await aim(b, -7, 1, 0.8);
        await b.mouse.down();
        await a.waitForTimeout(1150);
        await b.mouse.up();
        await capture("reaction");
        expect(
          Object.keys((await state(a)).metrics.transformations).some((k) =>
            k.includes("vaporize"),
          ),
        ).toBe(true);
        if (loadout === "flow-echo") {
          const moved = (await state(a)).fields.find(
            (f: any) => f.id === fieldBefore.id,
          );
          expect(moved.pos.z).toBeLessThan(fieldBefore.pos.z - 0.2);
          await fixture(a, b, [
            { id: "mage-1", pos: { x: 0, y: 0.75, z: 4 } },
            { id: "mage-2", pos: { x: 3, y: 0.75, z: 4 } },
          ]);
          await b.keyboard.press("4");
          await a.waitForFunction(
            () =>
              window.__RUINWEAVERS__.getState().actors["mage-2"]
                .activePrinciple === "Stone",
          );
          await aim(b, 7, 1);
          await b.keyboard.down("j");
          await b.waitForTimeout(120);
          await b.keyboard.up("j");
          await a.waitForTimeout(900);
          await capture("alteration");
          expect(
            Object.keys((await state(a)).metrics.damageRoutes).some((k) =>
              k.includes("eruption"),
            ),
          ).toBe(true);
        } else {
          await a.keyboard.press("4");
          await aim(a, -9, 0);
          await a.keyboard.press("f");
          await a.waitForTimeout(300);
          expect(
            (await state(a)).fields.filter((f: any) => f.source === "mage-1"),
          ).toHaveLength(2);
          await b.keyboard.press("3");
          await aim(b, -4, 5);
          await b.keyboard.press("f");
          await b.waitForTimeout(300);
          const galeBefore = (await state(a)).fields.find(
            (f: any) => f.source === "mage-2",
          );
          await b.keyboard.down("d");
          await b.waitForTimeout(800);
          await b.keyboard.up("d");
          await a.waitForTimeout(150);
          const galeAfter = (await state(a)).fields.find(
            (f: any) => f.id === galeBefore.id,
          );
          expect(galeAfter.pos.x).toBeGreaterThan(galeBefore.pos.x + 0.5);
          await capture("alteration");
        }
        await fixture(
          a,
          b,
          [
            { id: "mage-1", pos: { x: -1, y: 0.75, z: 4 } },
            { id: "mage-2", pos: { x: 1, y: 0.75, z: 4 } },
          ],
          true,
        );
        await a.keyboard.press("1");
        await aim(a, -6, -4);
        await a.mouse.down();
        await b.keyboard.press("3");
        await aim(b, 2, 0);
        await a.keyboard.down("a");
        await b.keyboard.down("d");
        for (let i = 0; i < 3; i++) {
          await b.keyboard.press("j");
          await a.waitForTimeout(300);
        }
        await a.keyboard.press("Space");
        await a.waitForTimeout(450);
        await a.mouse.up();
        await a.keyboard.up("a");
        await b.keyboard.up("d");
        await capture("danger");
        const cdp = await a.context().newCDPSession(a);
        await cdp.send("Emulation.setEmulatedVisionDeficiency", {
          type: "achromatopsia",
        });
        await capture("grayscale");
        await cdp.send("Emulation.setEmulatedVisionDeficiency", {
          type: "deuteranopia",
        });
        await capture("deuteranopia");
        await cdp.send("Emulation.setEmulatedVisionDeficiency", {
          type: "none",
        });
        if (finish) {
          await fixture(a, b, [
            { id: "mage-1", pos: { x: 0, y: 0.75, z: 4 }, hp: 100 },
            { id: "mage-2", pos: { x: 1, y: 0.75, z: 4 }, hp: 0 },
          ]);
          await capture("downed");
          await a.keyboard.down("e");
          await a.waitForFunction(
            () =>
              window.__RUINWEAVERS__
                .getState()
                .entities.find((e: any) => e.id === "mage-2").hp > 0,
          );
          await a.keyboard.up("e");
          await capture("revived");
        }
        await clearFixture(a, b);
        await capture("reward");
        for (const p of [a, b])
          await p.locator("#reward-cards button").first().click();
        await ready([a, b]);
        await a.keyboard.down("w");
        await a.waitForTimeout(400);
        await a.keyboard.up("w");
        expect((await state(a)).trial.encounter).toBe(3);
        expect(
          await a.evaluate(
            () => window.__RUINWEAVERS__.getMetrics().render.art.active,
          ),
        ).toBe(art === "illustrated");
        evidence.returnToPlay = true;
        expect(errors).toEqual([]);
      } finally {
        evidence.finalState = await state(a).catch(() => null);
        evidence.finalState = compactState(evidence.finalState);
        evidence.captures.forEach((capture: any) => {
          capture.state = compactState(capture.state);
        });
        evidence.marks = marks;
        evidence.errors = errors;
        writeFileSync(
          `${dir}/${art}-${loadout}.json`,
          JSON.stringify(evidence, null, 2),
        );
        await ca.close();
        await cb.close();
        await video.saveAs(`${dir}/raw/${art}-${loadout}.webm`);
      }
    });
