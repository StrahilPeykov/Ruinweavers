import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("artifacts", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5173/?scene=combat");
await page.waitForFunction(() => !!window.__RUINWEAVERS__);
const api = () => page.evaluate(() => window.__RUINWEAVERS__.getState());
async function ticks(n: number) {
  const t = (await api()).tick;
  await page.waitForFunction(
    (t) => window.__RUINWEAVERS__.getState().tick >= t,
    t + n,
  );
}
async function aim(x: number, z: number) {
  const p = await page.evaluate(
    ({ x, z }) => window.__RUINWEAVERS__.projectWorld({ x, y: 0, z }),
    { x, z },
  );
  await page.mouse.move(p.x, p.y);
}
const observations: any[] = [];
for (const tempo of ["deliberate", "balanced", "faster"]) {
  await page.evaluate(
    (tempo) =>
      window.__RUINWEAVERS__.setExperimentConfig({ scene: "combat", tempo }),
    tempo,
  );
  await ticks(10);
  await aim(5, -8);
  await page.keyboard.down("a");
  await page.mouse.down();
  await ticks(35);
  await page.keyboard.press("2");
  await ticks(25);
  await page.keyboard.press("Space");
  await ticks(20);
  await page.keyboard.up("a");
  await page.mouse.up();
  await aim(5, -8);
  await page.keyboard.press("f");
  await ticks(15);
  await page.keyboard.down("d");
  await page.keyboard.press("Tab");
  await page.mouse.down();
  await ticks(35);
  await page.keyboard.press("4");
  await ticks(35);
  await page.mouse.up();
  await page.keyboard.up("d");
  await page.screenshot({ path: `artifacts/tempo-${tempo}.png` });
  observations.push({
    tempo,
    state: await api(),
    metrics: await page.evaluate(() => window.__RUINWEAVERS__.getMetrics()),
  });
}
await page.evaluate(() =>
  window.__RUINWEAVERS__.setExperimentConfig({
    scene: "traversal",
    tempo: "balanced",
    model: "weave-unweave",
  }),
);
await ticks(10);
await aim(5.7, 1);
await page.keyboard.press("4");
await page.keyboard.press("f");
await ticks(50);
await page.keyboard.press("3");
await page.mouse.click(1000, 600);
await ticks(20);
await page.screenshot({ path: "artifacts/fracture-force.png" });
observations.push({ environment: await api() });
await page.evaluate(() =>
  window.__RUINWEAVERS__.setExperimentConfig({
    scene: "states",
    model: "primary-secondary",
    secondaryCapacity: 3,
  }),
);
await ticks(10);
for (const [key, x, z] of [
  ["2", -5, -5],
  ["3", 0, -3],
  ["1", -2, -5],
] as [string, number, number][]) {
  await page.keyboard.press(key);
  await aim(x, z);
  await page.keyboard.press("f");
  await ticks(45);
}
await page.keyboard.press("1");
await aim(-5, -5.5);
await page.mouse.down();
await ticks(300);
await page.mouse.up();
await page.screenshot({ path: "artifacts/dense-effects-1080p.png" });
const renderer = await page.evaluate(() => {
  const gl = document.querySelector("canvas")!.getContext("webgl2")!;
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unavailable";
});
observations.push({
  stress: await page.evaluate(() => window.__RUINWEAVERS__.getMetrics()),
  renderer,
  errors,
});
writeFileSync(
  "artifacts/play-session.json",
  JSON.stringify(observations, null, 2),
);
console.log(
  JSON.stringify(
    {
      comparisons: observations
        .slice(0, 3)
        .map((o) => ({
          tempo: o.tempo,
          playerHp: o.state.entities[0].hp,
          switches: o.state.metrics.switches,
          metrics: o.metrics.render,
        })),
      stress: observations.at(-1),
    },
    null,
    2,
  ),
);
await browser.close();
