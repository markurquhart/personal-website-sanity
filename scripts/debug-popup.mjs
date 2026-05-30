// Hover each pin in sequence and log popup position + transform so we
// can see exactly where it ends up.

import { chromium } from "playwright";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

page.on("console", (msg) => {
  if (!msg.text().includes("React DevTools") && !msg.text().includes("HMR")) {
    console.log(`[${msg.type()}]`, msg.text());
  }
});

await page.goto("http://localhost:3000/travel", {
  waitUntil: "load",
  timeout: 60000,
});
await page.waitForTimeout(4000);

const pinCount = await page.locator('[data-track="travel-map-pin"]').count();
console.log(`found ${pinCount} pins`);

for (let i = 0; i < pinCount; i++) {
  const pin = page.locator('[data-track="travel-map-pin"]').nth(i);
  const pinBox = await pin.boundingBox();
  console.log(`\n--- pin ${i} at (${pinBox?.x}, ${pinBox?.y}) ---`);
  await pin.hover();
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => {
    const popup = document.querySelector(".maplibregl-popup");
    if (!popup) return { found: false };
    const rect = popup.getBoundingClientRect();
    const style = window.getComputedStyle(popup);
    return {
      found: true,
      class: popup.className,
      transform: style.transform,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  });
  console.log(JSON.stringify(info));
  // Move mouse far away to clear hover
  await page.mouse.move(50, 50);
  await page.waitForTimeout(500);
}

await browser.close();
