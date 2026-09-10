const evidenceRoot = `test-results/evidence-lobby.spec-${Date.now()}`;
import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

test("lobby text selection survives the live UI refresh", async ({ page }) => {
  await page.goto("/?scene=trial");
  await page.waitForFunction(() => !!window.__RUINWEAVERS__);
  await page.locator("#trial-copy").dblclick();
  const selected = await page.evaluate(() => getSelection()?.toString());
  expect(selected?.length).toBeGreaterThan(0);
  await page.waitForTimeout(450);
  expect(await page.evaluate(() => getSelection()?.toString())).toBe(selected);
});

test("short room codes copy, paste and join; connected labels keep their selection", async ({
  browser,
}) => {
  test.setTimeout(60000);
  const hostContext = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    }),
    guestContext = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    });
  const host = await hostContext.newPage(),
    guest = await guestContext.newPage();
  for (const p of [host, guest]) {
    await p.goto("/?scene=trial");
    await p.waitForFunction(() => !!window.__RUINWEAVERS__);
    await p.getByText("Connection options", { exact: true }).click();
    await p.locator("#signaling").selectOption("local");
  }
  await host.getByRole("button", { name: "Create co-op", exact: true }).click();
  await expect(host.locator("#share-code")).toHaveValue(/^[A-Z2-9]{6}$/);
  const code = await host.locator("#share-code").inputValue();
  await host.getByRole("button", { name: "Copy code", exact: true }).click();
  await expect(host.locator("#copy-feedback")).toContainText("Copied!");
  expect(await host.evaluate(() => navigator.clipboard.readText())).toBe(code);
  await guest.locator("#room-code").click();
  await guest.keyboard.press("Control+V");
  await expect(guest.locator("#room-code")).toHaveValue(code);
  // Lowercase and accidental whitespace are accepted too.
  await guest.locator("#room-code").fill(" " + code.toLowerCase() + " ");
  await guest.getByRole("button", { name: "Join co-op", exact: true }).click();
  for (const p of [host, guest])
    await p.waitForFunction(
      () => window.__RUINWEAVERS__.getNetworkState().status === "connected",
      undefined,
      { timeout: 20000 },
    );
  await host.locator("#trial-title").dblclick();
  const selected = await host.evaluate(() => getSelection()?.toString());
  expect(selected?.length).toBeGreaterThan(0);
  await host.waitForTimeout(400);
  expect(await host.evaluate(() => getSelection()?.toString())).toBe(selected);
  mkdirSync(`${evidenceRoot}/room-sharing`, { recursive: true });
  await host.screenshot({
    path: `${evidenceRoot}/room-sharing/copied-connected.png`,
  });
  writeFileSync(
    `${evidenceRoot}/room-sharing/connected.json`,
    JSON.stringify(
      await host.evaluate(() => ({
        network: window.__RUINWEAVERS__.getNetworkState(),
        state: window.__RUINWEAVERS__.getState(),
        viewport: { width: innerWidth, height: innerHeight },
        browser: navigator.userAgent,
      })),
      null,
      2,
    ),
  );
  for (const p of [host, guest])
    await p.getByRole("button", { name: "Ready", exact: true }).click();
  for (const p of [host, guest])
    await p.waitForFunction(
      () => window.__RUINWEAVERS__.getState().trial.status === "active",
    );
  await hostContext.close();
  await guestContext.close();
});

test("clipboard denial leaves a stable selected code for manual copying", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/?scene=trial");
  await page.waitForFunction(() => !!window.__RUINWEAVERS__);
  await page.getByText("Connection options", { exact: true }).click();
  await page.locator("#signaling").selectOption("local");
  await page.getByRole("button", { name: "Create co-op", exact: true }).click();
  await expect(page.locator("#share-code")).toHaveValue(/^[A-Z2-9]{6}$/);
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new DOMException("Test permission denial", "NotAllowedError");
    };
  });
  await page.getByRole("button", { name: "Copy code", exact: true }).click();
  await expect(page.locator("#copy-feedback")).toContainText("Ctrl+C");
  await page.waitForTimeout(400);
  expect(
    await page
      .locator("#share-code")
      .evaluate((e: HTMLInputElement) =>
        e.value.substring(e.selectionStart!, e.selectionEnd!),
      ),
  ).toBe(await page.locator("#share-code").inputValue());
  await page.keyboard.press("Control+C");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    await page.locator("#share-code").inputValue(),
  );
  await page.setViewportSize({ width: 860, height: 640 });
  mkdirSync(`${evidenceRoot}/room-sharing`, { recursive: true });
  await page.screenshot({
    path: `${evidenceRoot}/room-sharing/manual-copy-compact.png`,
  });
});
