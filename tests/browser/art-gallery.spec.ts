import { test, expect } from "@playwright/test";

test("art comparison media, compact layout and recommended entry", async ({
  page,
}) => {
  await page.goto("/art-study/index.html");
  await expect(
    page.getByRole("heading", { name: "Two courts. One magical language." }),
  ).toBeVisible();
  await expect(page.locator("video")).toHaveCount(4);
  for (const video of await page.locator("video").all()) {
    await video.evaluate(async (node: HTMLVideoElement) => {
      node.muted = true;
      await node.play();
    });
    await expect
      .poll(() => video.evaluate((node: HTMLVideoElement) => node.currentTime))
      .toBeGreaterThan(0);
    expect(
      await video.evaluate((node: HTMLVideoElement) => node.videoWidth),
    ).toBe(960);
    await video.evaluate((node: HTMLVideoElement) => node.pause());
  }
  await page.screenshot({ path: "artifacts/art-proof/gallery-desktop.png" });
  await page.setViewportSize({ width: 860, height: 640 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    860,
  );
  await page.screenshot({ path: "artifacts/art-proof/gallery-compact.png" });
  await page.goto("/?quality=lightweight");
  await page.waitForFunction(() => !!window.__RUINWEAVERS__);
  expect(
    await page.evaluate(
      () => window.__RUINWEAVERS__.getMetrics().render.art.mode,
    ),
  ).toBe("storybook");
  await expect(page.locator("#panel")).toBeHidden();
  await page.locator("#trial-action").click();
  await page.waitForFunction(
    () => window.__RUINWEAVERS__.getState().trial.status === "active",
  );
});
