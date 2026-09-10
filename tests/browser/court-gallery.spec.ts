import { test, expect } from "@playwright/test";

test("three actual build clips decode and retain a compact direct-to-run handoff", async ({
  page,
}) => {
  await page.goto("/build-identity/index.html");
  await expect(
    page.getByRole("heading", { name: "One mage, three builds", exact: true }),
  ).toBeVisible();
  await expect(page.locator("article")).toHaveCount(3);
  for (const video of await page.locator("video").all()) {
    await video.evaluate(async (v: HTMLVideoElement) => {
      v.muted = true;
      await v.play();
    });
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
      .toBeGreaterThan(0);
    expect(await video.evaluate((v: HTMLVideoElement) => v.videoWidth)).toBe(
      960,
    );
    await video.evaluate((v: HTMLVideoElement) => v.pause());
  }
  expect(
    await page
      .locator("img")
      .evaluateAll((images: HTMLImageElement[]) =>
        images.every((i) => i.complete && i.naturalWidth === 1440),
      ),
  ).toBe(true);
  await page.setViewportSize({ width: 660, height: 760 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    660,
  );
  await page
    .getByRole("link", { name: "Play the Broken Court solo or together" })
    .click();
  await page.waitForFunction(() => !!window.__RUINWEAVERS__);
  expect(
    await page.evaluate(
      () => window.__RUINWEAVERS__.getExperimentConfig().scene,
    ),
  ).toBe("run");
  await expect(page.locator("#panel")).toBeHidden();
});

test("actual-run handoff media decodes and opens the normal illustrated run", async ({
  page,
}) => {
  await page.goto("/broken-court/index.html");
  await expect(
    page.getByRole("heading", { name: "Through the Broken Court" }),
  ).toBeVisible();
  const video = page.locator("video");
  await video.evaluate(async (v: HTMLVideoElement) => {
    v.muted = true;
    await v.play();
  });
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0);
  expect(await video.evaluate((v: HTMLVideoElement) => v.videoWidth)).toBe(960);
  await video.evaluate((v: HTMLVideoElement) => v.pause());
  await page.setViewportSize({ width: 660, height: 760 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    660,
  );
  await page
    .getByRole("link", { name: "Play solo or create / join co-op" })
    .click();
  await page.waitForFunction(() => !!window.__RUINWEAVERS__);
  expect(
    await page.evaluate(
      () => window.__RUINWEAVERS__.getExperimentConfig().scene,
    ),
  ).toBe("run");
  expect(
    await page.evaluate(
      () => window.__RUINWEAVERS__.getMetrics().render.art.active,
    ),
  ).toBe(true);
  await expect(page.locator("#panel")).toBeHidden();
  await page.locator("#trial-action").click();
  await page.waitForFunction(
    () => window.__RUINWEAVERS__.getState().trial.status === "active",
  );
});
