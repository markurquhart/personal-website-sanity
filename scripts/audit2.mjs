import { chromium } from "playwright";
import { mkdirSync } from "fs";

const VIEWPORTS = [
  { name: "1440", w: 1440, h: 900 },
  { name: "1200", w: 1200, h: 900 },
  { name: "1100", w: 1100, h: 800 },
  { name: "700", w: 700, h: 600 },
];

mkdirSync("/tmp/site-audit/local", { recursive: true });
const browser = await chromium.launch();

for (const v of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: v.w, height: v.h },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: `/tmp/site-audit/local/home-${v.name}.png`,
    fullPage: false,
  });
  // Measure key elements
  const m = await page.evaluate(() => {
    const r = (el) => el?.getBoundingClientRect();
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      body: r(document.body),
      outer: r(document.querySelector('main')?.parentElement),
      nav: r(document.querySelector('nav')),
      main: r(document.querySelector('main')),
      sliderWrap: r(document.querySelector('main > div')),
      swiper: r(document.querySelector('.swiper')),
    };
  });
  const dump = (label, b) =>
    b ? `${label}: x=${b.x.toFixed(0)} w=${b.width.toFixed(0)} right=${b.right.toFixed(0)}` : `${label}: null`;
  console.log(`\n${v.name} viewport=${m.viewport.w}x${m.viewport.h}`);
  console.log(' ', dump('outer', m.outer));
  console.log(' ', dump('nav', m.nav));
  console.log(' ', dump('main', m.main));
  console.log(' ', dump('sliderWrap', m.sliderWrap));
  console.log(' ', dump('swiper', m.swiper));
  await ctx.close();
}
await browser.close();
