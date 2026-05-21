// Compare across multiple widths so we catch in-between breakpoints.
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const VIEWPORTS = [
  { name: "1440", w: 1440, h: 900 },
  { name: "1200", w: 1200, h: 800 },
  { name: "1024", w: 1024, h: 768 },
  { name: "900", w: 900, h: 700 },
  { name: "768", w: 768, h: 1024 },
  { name: "600", w: 600, h: 800 },
  { name: "390", w: 390, h: 844 },
];

const PAGES = [{ name: "home", path: "/" }];

const SITE = { id: "local", base: "http://localhost:3000" };

mkdirSync("/tmp/site-audit/local", { recursive: true });

const browser = await chromium.launch();

for (const v of VIEWPORTS) {
  for (const p of PAGES) {
    const ctx = await browser.newContext({
      viewport: { width: v.w, height: v.h },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    const url = SITE.base + p.path;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: `/tmp/site-audit/local/${p.name}-${v.name}.png`,
        fullPage: false,
      });
      console.log(`✓ ${p.name} ${v.name} (${v.w}x${v.h})`);
    } catch (e) {
      console.log(`✗ ${p.name} ${v.name}: ${e.message}`);
    }
    await ctx.close();
  }
}

await browser.close();
