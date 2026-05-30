// Screenshot /travel at the required viewports to verify the responsive
// behavior at the xl: breakpoint.

import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("/tmp/travel-audit", { recursive: true });

const PAGES = [
  { name: "index", path: "/travel" },
];

// Required viewports per AGENTS.md
const VIEWPORTS = [
  { name: "1440", w: 1440, h: 900 },
  { name: "1280", w: 1280, h: 900 },
  { name: "1100", w: 1100, h: 900 },
  { name: "1024", w: 1024, h: 900 },
  { name: "768", w: 768, h: 1024 },
  { name: "600", w: 600, h: 900 },
  { name: "390", w: 390, h: 844 },
];

const browser = await chromium.launch();
for (const p of PAGES) {
  for (const v of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: v.w, height: v.h },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    try {
      await page.goto("http://localhost:3000" + p.path, {
        waitUntil: "load",
        timeout: 60000,
      });
      // Give MapLibre time to render tiles.
      await page.waitForTimeout(3500);
      await page.screenshot({
        path: `/tmp/travel-audit/${p.name}-${v.name}.png`,
        fullPage: true,
      });
      console.log(`✓ ${p.name} ${v.name}`);
    } catch (e) {
      console.log(`✗ ${p.name} ${v.name}: ${e.message}`);
    }
    await ctx.close();
  }
}
await browser.close();
