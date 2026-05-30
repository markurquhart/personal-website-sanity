// Verify cluster click zooms in and reveals individual pins. Screenshots
// at three states: world view (cluster visible), after first click
// (mid-zoom), after second click (all pins separate).

import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("/tmp/travel-audit", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto("http://localhost:3000/travel", {
  waitUntil: "load",
  timeout: 60000,
});
await page.waitForTimeout(4500);
await page.screenshot({
  path: "/tmp/travel-audit/cluster-0-initial.png",
  clip: { x: 0, y: 0, width: 1440, height: 600 },
});
console.log(`✓ initial — ${await page.locator('[data-track="travel-map-cluster"]').count()} clusters, ${await page.locator('[data-track="travel-map-pin"]').count()} pins`);

const cluster = page.locator('[data-track="travel-map-cluster"]').first();
if (await cluster.count() > 0) {
  await cluster.click();
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: "/tmp/travel-audit/cluster-1-clicked.png",
    clip: { x: 0, y: 0, width: 1440, height: 600 },
  });
  console.log(`✓ after first click — ${await page.locator('[data-track="travel-map-cluster"]').count()} clusters, ${await page.locator('[data-track="travel-map-pin"]').count()} pins`);

  const cluster2 = page.locator('[data-track="travel-map-cluster"]').first();
  if (await cluster2.count() > 0) {
    await cluster2.click();
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: "/tmp/travel-audit/cluster-2-clicked.png",
      clip: { x: 0, y: 0, width: 1440, height: 600 },
    });
    console.log(`✓ after second click — ${await page.locator('[data-track="travel-map-cluster"]').count()} clusters, ${await page.locator('[data-track="travel-map-pin"]').count()} pins`);
  }
}

await browser.close();
