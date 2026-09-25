import { test } from "@playwright/test";
import { archivedGallery } from "./archive-helper";

test("Guardian media archive links to the current complete run", async ({ page }) => {
  await archivedGallery(page, "/guardian/index.html");
});
