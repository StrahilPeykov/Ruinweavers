import { expect, type Page } from "@playwright/test";

export async function archivedGallery(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByText("Historical study", { exact: true })).toBeVisible();
  await expect(page.locator("video, img")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Current gameplay and video" })).toHaveAttribute("href", "/topology/index.html");
  await expect(page.getByRole("link", { name: "the archived repository snapshot" })).toHaveAttribute("href", /dc4bf509/);
  await page.setViewportSize({ width: 660, height: 760 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Play Ruinweavers", exact: true }).click();
  await page.waitForFunction(() => window.__RUINWEAVERS__?.getMetrics().render.art.active);
  expect(await page.evaluate(() => window.__RUINWEAVERS__.getExperimentConfig().scene)).toBe("run");
  await expect(page.locator("#panel")).toBeHidden();
  await page.locator("#trial-action").click();
  await page.waitForFunction(() => window.__RUINWEAVERS__.getState().trial.status === "active");
}
