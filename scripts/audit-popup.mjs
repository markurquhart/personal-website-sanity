// Hover a pin and capture the popup at desktop + mobile widths.

import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("/tmp/travel-audit", { recursive: true });

const VIEWPORTS = [
  { name: "1440-popup", w: 1440, h: 900 },
  { name: "390-popup", w: 390, h: 844 },
];

const browser = await chromium.launch();

for (const v of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: v.w, height: v.h },
    deviceScaleFactor: 1,
    hasTouch: v.w < 768,
  });
  const page = await ctx.newPage();
  try {
    await page.goto("http://localhost:3000/travel", {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.waitForTimeout(4000);

    const pinSelector = '[data-track="travel-map-pin"]';
    await page.waitForSelector(pinSelector, { timeout: 10000 });

    if (v.w < 768) {
      // Mobile: tap a pin
      await page.locator(pinSelector).first().tap();
    } else {
      // Desktop: hover
      await page.locator(pinSelector).first().hover();
    }
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: `/tmp/travel-audit/${v.name}.png`,
      fullPage: false,
    });
    console.log(`✓ ${v.name}`);
  } catch (e) {
    console.log(`✗ ${v.name}: ${e.message}`);
  }
  await ctx.close();
}
await browser.close();
