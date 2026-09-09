import { test, expect } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

async function sampleFrames(page: import("@playwright/test").Page) {
  // Exclude quality-switch shader compilation; these are software-renderer
  // diagnostics, never a performance threshold or proof of a hardware benefit.
  await page.waitForTimeout(2500);
  return page.evaluate(
    () =>
      new Promise<{ meanMs: number; p95Ms: number; samples: number }>(
        (resolve) => {
          const intervals: number[] = [];
          let previous = 0;
          function frame(now: number) {
            if (previous) intervals.push(now - previous);
            previous = now;
            if (intervals.length < 60) requestAnimationFrame(frame);
            else {
              const sorted = [...intervals].sort((a, b) => a - b);
              resolve({
                meanMs: intervals.reduce((a, b) => a + b, 0) / intervals.length,
                p95Ms: sorted[57],
                samples: intervals.length,
              });
            }
          }
          requestAnimationFrame(frame);
        },
      ),
  );
}

test("local rendering quality reduces work, preserves fields, persists, and exports diagnostics", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });
  const page = await context.newPage();
  await page.goto("/?scene=free&quality=standard");
  await page.waitForFunction(() => !!window.__RUINWEAVERS__);
  await page.keyboard.press("4");
  await page.mouse.move(700, 350);
  await page.mouse.click(700, 350, { button: "right" });
  await page.waitForFunction(
    () => window.__RUINWEAVERS__.getState().fields.length === 1,
  );
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const before = await page.evaluate(() => window.__RUINWEAVERS__.getState());
  await page.getByRole("button", { name: "Experiments", exact: true }).click();
  const standardFrames = await sampleFrames(page);
  const standard = await page.evaluate(
    () => window.__RUINWEAVERS__.getMetrics().render,
  );
  await page.locator("#quality").selectOption("lightweight");
  const lightweightFrames = await sampleFrames(page);
  const after = await page.evaluate(() => window.__RUINWEAVERS__.getState());
  expect(after.tick).toBe(before.tick);
  expect(after.fields).toEqual(before.fields);
  expect(after.entities).toEqual(before.entities);
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export observations", exact: true })
    .click();
  const download = await downloadPromise;
  const report = JSON.parse(readFileSync((await download.path())!, "utf8"));
  expect(report.render.quality).toBe("lightweight");
  expect(report.render.shadows).toBe(false);
  expect(report.render.drawingBuffer.width).toBeLessThanOrEqual(1280);
  expect(report.render.drawingBuffer.height).toBeLessThanOrEqual(720);
  expect(report.render.renderer).toBeTruthy();
  expect(report.network).toMatchObject({ role: "solo", paths: [] });
  await page.locator("#close").click();
  mkdirSync("artifacts/render-quality", { recursive: true });
  await page.screenshot({ path: "artifacts/render-quality/lightweight.png" });
  writeFileSync(
    "artifacts/render-quality/comparison.json",
    JSON.stringify(
      {
        context:
          "One headless Chromium client, ANGLE SwiftShader; frozen Lab, not a real laptop GPU or network performance measurement",
        build: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
        viewSha256: createHash("sha256")
          .update(readFileSync("src/render/view.ts"))
          .digest("hex"),
        steadyFrames: {
          standard: standardFrames,
          lightweight: lightweightFrames,
        },
        standard,
        lightweight: report.render,
      },
      null,
      2,
    ),
  );
  await page.goto("/?scene=trial");
  await page.getByRole("button", { name: "Experiments", exact: true }).click();
  await expect(page.locator("#quality")).toHaveValue("lightweight");
  await page.locator("#quality").selectOption("standard");
  expect(
    (await page.evaluate(() => window.__RUINWEAVERS__.getMetrics())).render
      .shadows,
  ).toBe(true);
  await context.close();
});
