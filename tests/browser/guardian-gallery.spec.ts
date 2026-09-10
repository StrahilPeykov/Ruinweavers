import { test, expect } from "@playwright/test";
test("Guardian capture page decodes real media, fits compact screens and links to play", async ({
  page,
}) => {
  await page.goto("/guardian/index.html");
  await expect(page.locator("h1")).toHaveText("The Bound Warden");
  await expect(page.locator("img")).toHaveCount(3);
  await expect(page.locator("video")).toHaveCount(3);
  expect(
    await page
      .locator("img")
      .evaluateAll((images) =>
        images.every(
          (i) =>
            (i as HTMLImageElement).complete &&
            (i as HTMLImageElement).naturalWidth > 0,
        ),
      ),
  ).toBe(true);
  for (const video of await page.locator("video").all()) {
    await video.evaluate((v: HTMLVideoElement) => v.load());
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState))
      .toBeGreaterThanOrEqual(1);
    await video.evaluate(async (v: HTMLVideoElement) => {
      v.muted = true;
      await v.play();
    });
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
      .toBeGreaterThan(0.1);
    await video.evaluate((v: HTMLVideoElement) => v.pause());
  }
  await page.setViewportSize({ width: 660, height: 760 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Play the complete Broken Court run" })
    .click();
  await page.waitForFunction(() => !!window.__RUINWEAVERS__);
  expect(
    await page.evaluate(
      () => window.__RUINWEAVERS__.getState().trial.encounter,
    ),
  ).toBe(0);
});
