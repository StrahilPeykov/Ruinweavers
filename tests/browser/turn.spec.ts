const evidenceRoot = `test-results/evidence-turn.spec-${Date.now()}`;
import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
test("relay-only diagnosis fails clearly before attempting direct-only matchmaking", async ({
  page,
}) => {
  await page.goto("/?scene=trial&relay=required");
  await page.waitForFunction(() => !!window.__RUINWEAVERS__);
  await page.getByRole("button", { name: "Create co-op", exact: true }).click();
  await expect(page.locator("#room-status")).toContainText(
    "Relay-only test needs configured TURN credentials",
  );
  expect(
    await page.evaluate(() => window.__RUINWEAVERS__.getNetworkState().status),
  ).toBe("failed");
  mkdirSync(`${evidenceRoot}/turn-setup`, { recursive: true });
  await page.screenshot({
    path: `${evidenceRoot}/turn-setup/missing-credentials.png`,
  });
  await page
    .getByRole("button", { name: "Return to solo", exact: true })
    .click();
  await page.getByRole("button", { name: "Start trial", exact: true }).click();
  expect(
    await page.evaluate(() => window.__RUINWEAVERS__.getState().trial.status),
  ).toBe("active");
});
test("credential endpoint failure is shown rather than claiming TURN is configured", async ({
  page,
}) => {
  await page.route("**/api/turn", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":"Relay configuration unavailable"}',
    }),
  );
  await page.goto("/?scene=trial");
  await page.waitForFunction(() => !!window.__RUINWEAVERS__);
  await page.getByRole("button", { name: "Create co-op", exact: true }).click();
  await expect(page.locator("#room-status")).toContainText(
    "site owner needs to check its relay credentials",
  );
  expect(
    await page.evaluate(
      () => window.__RUINWEAVERS__.getNetworkState().turnStatus,
    ),
  ).toBe("unavailable");
});
