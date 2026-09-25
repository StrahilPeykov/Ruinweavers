import { test } from "@playwright/test";
import { archivedGallery } from "./archive-helper";

test("build showcase retirement keeps current media discoverable", async ({ page }) => {
  await archivedGallery(page, "/build-identity/index.html");
});

test("old fixed run showcase retirement keeps the normal entry", async ({ page }) => {
  await archivedGallery(page, "/broken-court/index.html");
});
