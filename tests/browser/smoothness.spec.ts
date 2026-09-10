const evidenceRoot = `test-results/evidence-smoothness.spec-${Date.now()}`;
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const label = process.env.RUIN_SMOOTHNESS_LABEL ?? "candidate";
const state = (p: Page) => p.evaluate(() => window.__RUINWEAVERS__.getState());
test("measure real guest taps, held cast and movement over WebRTC with matched application delay", async ({
  browser,
}) => {
  test.setTimeout(120000);
  const ca = await browser.newContext(),
    cb = await browser.newContext(),
    a = await ca.newPage(),
    b = await cb.newPage();
  const observations: any[] = [];
  const errors: string[] = [];
  for (const p of [a, b]) p.on("pageerror", (e) => errors.push(e.message));
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
    mkdirSync(`${evidenceRoot}/smoothness`, { recursive: true });
    writeFileSync(
      `${evidenceRoot}/smoothness/${label}-environment.json`,
      JSON.stringify(
        await b.evaluate(() => ({
          build: window.__RUINWEAVERS__.getNetworkState().build,
          render: window.__RUINWEAVERS__.getMetrics().render,
        })),
        null,
        2,
      ),
    );
    // Observe actual mailbox/cast decisions; these wrappers never supply inputs or alter returns.
    if (process.env.RUIN_INPUT_TRACE === "1")
      await a.evaluate(async () => {
        const w = window as any;
        w.inputDecisions = [];
        const { InputMailbox } = await new Function(
          "return import('/src/network/input-mailbox.ts')",
        )();
        const { Simulation } = await new Function(
          "return import('/src/simulation/simulation.ts')",
        )();
        const receive = InputMailbox.prototype.receive;
        InputMailbox.prototype.receive = function (
          p: any,
          epoch: number,
          now: number,
        ) {
          const accepted = receive.call(this, p, epoch, now);
          if (p.metaAck !== undefined && (p.primaryPress || p.input.primary)) {
            w.inputDecisions.push({
              kind: "receive",
              at: performance.now(),
              seq: p.seq,
              press: p.primaryPressId,
              held: p.input.primary,
              accepted,
            });
            if (w.inputDecisions.length > 250) w.inputDecisions.shift();
          }
          return accepted;
        };
        const cast = Simulation.prototype.cast;
        Simulation.prototype.cast = function (...args: any[]) {
          if (this.actorId === "mage-2" && args[0] === "primary") {
            w.inputDecisions.push({
              kind: "cast-attempt",
              at: performance.now(),
              time: this.state.time,
              ready: this.actor.primaryReady,
              aim: args[3],
              principle: args[2],
            });
            if (w.inputDecisions.length > 250) w.inputDecisions.shift();
          }
          return cast.apply(this, args);
        };
      });
    for (const delayMs of [0, 80]) {
      await a.evaluate(() => {
        const api = window.__RUINWEAVERS__;
        api.setPaused(true);
        api.setupTestState({
          enemyEnabled: false,
          entities: [
            { id: "mage-1", pos: { x: -4, y: 0.75, z: 5 } },
            { id: "mage-2", pos: { x: 1, y: 0.75, z: 5 } },
          ],
        });
        api.setPaused(false);
      });
      for (const p of [a, b])
        await p.evaluate(
          (delayMs) =>
            window.__RUINWEAVERS__.setNetworkProfile({
              delayMs,
              jitterMs: delayMs ? 20 : 0,
              seed: 42,
            }),
          delayMs,
        );
      await b.waitForTimeout(400);
      // A headed browser can inherit the real cursor over unsupported geometry.
      // Establish a valid aim through actual pointer input for the keyboard tap test.
      await b.bringToFront();
      const floorAim = await b.evaluate(() =>
        window.__RUINWEAVERS__.projectWorld({ x: 1, y: 0, z: 2 }),
      );
      await b.mouse.move(floorAim.x, floorAim.y);
      const startCount =
        (await state(a)).metrics.outcomes["mage-2:cast:Ember:primary"] ?? 0;
      for (const phase of [5, 16, 25]) {
        await b.waitForTimeout(500 + phase);
        // Slow frames and jitter can compress wall-clock-spaced packets into one cooldown.
        // Verify delivery only when the preceding cast has completed authoritative recovery.
        await a.waitForFunction(() => {
          const s = window.__RUINWEAVERS__.getState();
          return s.time >= s.actors["mage-2"].primaryReady;
        });
        const before =
          (await state(a)).metrics.outcomes["mage-2:cast:Ember:primary"] ?? 0;
        await b.keyboard.down("j");
        await b.waitForTimeout(10);
        await b.keyboard.up("j");
        await a.waitForFunction(
          (before) =>
            (window.__RUINWEAVERS__.getState().metrics.outcomes[
              "mage-2:cast:Ember:primary"
            ] ?? 0) > before,
          before,
        );
      }
      await b.waitForTimeout(500);
      const taps =
        ((await state(a)).metrics.outcomes["mage-2:cast:Ember:primary"] ?? 0) -
        startCount;
      // Measure from the actual DOM keydown in the guest's own clock.
      await b.evaluate(() => {
        const w = window as any;
        w.motionTrace = [];
        w.motionStart = 0;
        window.addEventListener(
          "keydown",
          function begin(e) {
            if (e.code === "KeyD") {
              w.motionStart = performance.now();
              window.removeEventListener("keydown", begin);
            }
          },
          { capture: true },
        );
        const end = performance.now() + 1500;
        function frame() {
          const api = w.__RUINWEAVERS__;
          const s = api.getPlayerState();
          const presented =
            api.getPresentation?.().entities.find((e: any) => e.id === s.id)
              ?.pos ?? s.pos;
          w.motionTrace.push({
            at: performance.now(),
            auth: { ...s.pos },
            visible: { ...presented },
          });
          if (performance.now() < end) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
      await b.keyboard.down("d");
      await b.waitForTimeout(300);
      await b.keyboard.up("d");
      await b.keyboard.down("j");
      await b.waitForTimeout(500);
      await b.keyboard.up("j");
      await b.waitForTimeout(800);
      const trace = await b.evaluate(() => ({
        start: (window as any).motionStart,
        rows: (window as any).motionTrace,
      }));
      const origin =
        trace.rows.filter((r: any) => r.at <= trace.start).at(-1) ??
        trace.rows[0];
      const response = (key: string) => {
        const first = trace.rows.find(
          (r: any) =>
            r.at >= trace.start && Math.abs(r[key].x - origin[key].x) > 0.015,
        );
        return first ? first.at - trace.start : null;
      };
      observations.push({
        delayMs,
        jitterMs: delayMs ? 20 : 0,
        taps,
        expectedTaps: 3,
        authoritativeResponseMs: response("auth"),
        visibleResponseMs: response("visible"),
        trace,
        inputDecisions: await a.evaluate(() => (window as any).inputDecisions),
        host: await a.evaluate(() =>
          window.__RUINWEAVERS__.getNetworkDiagnostics(),
        ),
        guest: await b.evaluate(() =>
          window.__RUINWEAVERS__.getNetworkDiagnostics(),
        ),
        hostRender: await a.evaluate(
          () => window.__RUINWEAVERS__.getMetrics().render,
        ),
        guestRender: await b.evaluate(
          () => window.__RUINWEAVERS__.getMetrics().render,
        ),
      });
    }
    const phaseTaps: any[] = [];
    if (label !== "baseline") {
      for (const p of [a, b])
        await p.evaluate(() =>
          window.__RUINWEAVERS__.setNetworkProfile({
            delayMs: 0,
            jitterMs: 0,
            seed: 42,
          }),
        );
      await b.evaluate(() => {
        (window as any).tapPhases = [];
        window.addEventListener("keydown", (e) => {
          if (e.code === "KeyJ")
            (window as any).tapPhases.push(
              performance.now() -
                window.__RUINWEAVERS__.getNetworkState().lastInputSendAt,
            );
        });
      });
      for (const phase of [2, 14, 25]) {
        await b.waitForTimeout(550);
        const previous = await b.evaluate(
          () => window.__RUINWEAVERS__.getNetworkState().lastInputSendAt,
        );
        await b.waitForFunction(
          (previous) =>
            window.__RUINWEAVERS__.getNetworkState().lastInputSendAt > previous,
          previous,
        );
        const before =
          (await state(a)).metrics.outcomes["mage-2:cast:Ember:primary"] ?? 0;
        await b.waitForTimeout(phase);
        await b.keyboard.down("j");
        await b.waitForTimeout(10);
        await b.keyboard.up("j");
        await a.waitForFunction(
          (before) =>
            (window.__RUINWEAVERS__.getState().metrics.outcomes[
              "mage-2:cast:Ember:primary"
            ] ?? 0) > before,
          before,
        );
        phaseTaps.push({
          requestedPhase: phase,
          actualPhase: (await b.evaluate(() => (window as any).tapPhases)).at(
            -1,
          ),
        });
        expect(
          (await state(a)).metrics.outcomes["mage-2:cast:Ember:primary"],
        ).toBe(before + 1);
      }
    }
    // Pointer taps use the same real DOM path, without substituting setup casts.
    await b.mouse.move(700, 420);
    const mouseTaps: number[] = [];
    for (const offset of [3, 17, 29]) {
      await b.waitForTimeout(550 + offset);
      const before =
        (await state(a)).metrics.outcomes["mage-2:cast:Ember:primary"] ?? 0;
      await b.mouse.down();
      await b.waitForTimeout(10);
      await b.mouse.up();
      await a.waitForFunction(
        (before) =>
          (window.__RUINWEAVERS__.getState().metrics.outcomes[
            "mage-2:cast:Ember:primary"
          ] ?? 0) > before,
        before,
      );
      mouseTaps.push(
        (await state(a)).metrics.outcomes["mage-2:cast:Ember:primary"] - before,
      );
    }
    // Observe a remote host with actual keyboard movement, independently of guest prediction.
    await b.evaluate(() => {
      const w = window as any;
      w.remoteTrace = [];
      const end = performance.now() + 1600;
      function frame() {
        const api = w.__RUINWEAVERS__;
        w.remoteTrace.push({
          at: performance.now(),
          tick: api.getState().tick,
          auth: api.getState().entities.find((e: any) => e.id === "mage-1").pos,
          visible: api
            .getPresentation()
            .entities.find((e: any) => e.id === "mage-1").pos,
        });
        if (performance.now() < end) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    await a.evaluate(() => {
      const w = window as any;
      w.hostTrace = [];
      w.hostStart = 0;
      window.addEventListener(
        "keydown",
        function begin(e) {
          if (e.code === "KeyD") {
            w.hostStart = performance.now();
            window.removeEventListener("keydown", begin);
          }
        },
        { capture: true },
      );
      const end = performance.now() + 1600;
      function frame() {
        const api = w.__RUINWEAVERS__;
        w.hostTrace.push({
          at: performance.now(),
          auth: { ...api.getPlayerState().pos },
          visible: {
            ...api
              .getPresentation()
              .entities.find((e: any) => e.id === "mage-1").pos,
          },
        });
        if (performance.now() < end) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    await a.keyboard.down("d");
    await a.waitForTimeout(900);
    await a.keyboard.up("d");
    await b.waitForTimeout(800);
    const remoteTrace = await b.evaluate(() => (window as any).remoteTrace);
    const hostTrace = await a.evaluate(() => ({
      start: (window as any).hostStart,
      rows: (window as any).hostTrace,
    }));
    expect(
      remoteTrace.some((r: any) => Math.abs(r.auth.x - r.visible.x) > 0.005),
    ).toBe(true);
    expect(mouseTaps).toEqual([1, 1, 1]);
    mkdirSync(`${evidenceRoot}/smoothness`, { recursive: true });
    writeFileSync(
      `${evidenceRoot}/smoothness/${label}-browser.json`,
      JSON.stringify(
        {
          build: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
          environment: `Two ${process.env.RUIN_HEADED === "1" ? "headed" : "headless"} ${process.env.RUIN_BROWSER_CHANNEL ?? "Chromium"} clients, one Windows PC, actual local WebRTC; application-scheduled delay, not physical network emulation`,
          observations,
          phaseTaps,
          mouseTaps,
          remoteTrace,
          hostTrace,
          errors,
        },
        null,
        2,
      ),
    );
    await b.screenshot({
      path: `${evidenceRoot}/smoothness/${label}-guest.png`,
    });
    expect(errors).toEqual([]);
    if (label !== "baseline")
      for (const o of observations) expect(o.taps).toBe(3);
  } finally {
    await ca.close();
    await cb.close();
  }
});
