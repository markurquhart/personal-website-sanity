import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("/tmp/site-audit/local", { recursive: true });
mkdirSync("/tmp/site-audit/prod", { recursive: true });

const PAGES = [
  { name: "blog-index", path: "/blog" },
  {
    name: "blog-post",
    path: "/blog/building-a-blog-with-webflow-and-claude-code",
  },
];

const VIEWPORTS = [
  { name: "1440", w: 1440, h: 900 },
  { name: "768", w: 768, h: 1024 },
  { name: "390", w: 390, h: 844 },
];

const browser = await chromium.launch();
for (const site of [
  { id: "local", base: "http://localhost:3000" },
  { id: "prod", base: "https://www.markurquhart.com" },
]) {
  for (const p of PAGES) {
    for (const v of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: v.w, height: v.h },
        deviceScaleFactor: 1,
      });
      const page = await ctx.newPage();
      try {
        await page.goto(site.base + p.path, {
          waitUntil: "load",
          timeout: 45000,
        });
        await page.waitForTimeout(4500);
        await page.screenshot({
          path: `/tmp/site-audit/${site.id}/${p.name}-${v.name}.png`,
          fullPage: true,
        });
        console.log(`✓ ${site.id} ${p.name} ${v.name}`);
      } catch (e) {
        console.log(`✗ ${site.id} ${p.name} ${v.name}: ${e.message}`);
      }
      await ctx.close();
    }
  }
}
await browser.close();
