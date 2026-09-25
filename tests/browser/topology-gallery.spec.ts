import { test, expect } from "@playwright/test";

test("topology handoff loads actual captures and a playable gameplay clip", async ({ page }) => {
  await page.goto("/topology/index.html");
  await expect(page.getByRole("heading", { name: "One court complex. Different paths." })).toBeVisible();
  await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
  const clip = page.locator("video");
  await clip.evaluate(async (video: HTMLVideoElement) => {
    video.load();
    if (video.readyState < 2) await new Promise<void>(resolve => video.addEventListener("loadeddata", () => resolve(), { once: true }));
    await video.play();
  });
  await page.waitForFunction(() => document.querySelector("video")!.currentTime > 0.2);
  await clip.evaluate((video: HTMLVideoElement) => video.pause());
  expect(await clip.evaluate((video: HTMLVideoElement) => video.duration)).toBeGreaterThan(29);
  await page.setViewportSize({ width: 600, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("link", { name: "Play Ruinweavers", exact: true })).toHaveAttribute("href", "/?quality=lightweight");
});
