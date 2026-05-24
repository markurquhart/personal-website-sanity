// Screenshot the book single page at a few widths so we can visually
// verify it before declaring it done.

import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("/tmp/book-audit", { recursive: true });

const PAGES = [
  // Completed — has rating + review + favorite + finished date
  { name: "completed", path: "/library/project-hail-mary" },
  // Up Next — exercises the morphing card / empty state
  { name: "up-next", path: "/library/wisdom-takes-work" },
];

const VIEWPORTS = [
  { name: "1440", w: 1440, h: 900 },
  { name: "768", w: 768, h: 1024 },
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
        timeout: 45000,
      });
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: `/tmp/book-audit/${p.name}-${v.name}.png`,
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
