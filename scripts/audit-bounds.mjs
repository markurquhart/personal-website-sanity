// Verify the table filters to map bounds. Click a cluster, wait for zoom,
// then count table rows.

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

const countRows = async () =>
  page.locator("table tbody tr").count();

const initialRows = await countRows();
console.log(`initial table rows (full view): ${initialRows}`);
await page.screenshot({
  path: "/tmp/travel-audit/bounds-0-initial.png",
});

// Click the cluster
const cluster = page.locator('[data-track="travel-map-cluster"]').first();
if (await cluster.count() > 0) {
  await cluster.click({ force: true });
  await page.waitForTimeout(1500);
  const afterRows = await countRows();
  console.log(`after first cluster click, rows: ${afterRows}`);
  await page.screenshot({
    path: "/tmp/travel-audit/bounds-1-after-cluster-click.png",
  });
}

await browser.close();
