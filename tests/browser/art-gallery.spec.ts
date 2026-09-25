import { test } from "@playwright/test";
import { archivedGallery } from "./archive-helper";

test("painted benchmark archive retains a current playable entry", async ({ page }) => {
  await archivedGallery(page, "/art-finish/index.html");
});

test("original art proof archive retains a current playable entry", async ({ page }) => {
  await archivedGallery(page, "/art-study/index.html");
});
