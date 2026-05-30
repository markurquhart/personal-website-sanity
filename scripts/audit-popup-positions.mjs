// Hover every pin and screenshot, plus check whether the popup is
// clipped by the map container. The goal is auto-flip behavior so no
// popup hits a map edge.

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
await page.waitForTimeout(4000);

const pins = await page.locator('[data-track="travel-map-pin"]').all();
console.log(`testing ${pins.length} pins`);

for (let i = 0; i < pins.length; i++) {
  await pins[i].hover();
  await page.waitForTimeout(900);

  const result = await page.evaluate(() => {
    const map = document.querySelector(".maplibregl-map");
    const popup = document.querySelector(".maplibregl-popup");
    if (!map || !popup) return { ok: false, reason: "no popup" };
    const mapRect = map.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const clipTop = popupRect.top < mapRect.top;
    const clipBottom = popupRect.bottom > mapRect.bottom;
    const clipLeft = popupRect.left < mapRect.left;
    const clipRight = popupRect.right > mapRect.right;
    return {
      ok: !(clipTop || clipBottom || clipLeft || clipRight),
      anchor: popup.className.match(/maplibregl-popup-anchor-(\S+)/)?.[1],
      clipTop,
      clipBottom,
      clipLeft,
      clipRight,
      popupRect: {
        top: Math.round(popupRect.top),
        left: Math.round(popupRect.left),
        right: Math.round(popupRect.right),
        bottom: Math.round(popupRect.bottom),
      },
      mapRect: {
        top: Math.round(mapRect.top),
        left: Math.round(mapRect.left),
        right: Math.round(mapRect.right),
        bottom: Math.round(mapRect.bottom),
      },
    };
  });

  const mark = result.ok ? "✓" : "✗";
  console.log(`${mark} pin ${i} anchor=${result.anchor}`, JSON.stringify(result));

  await page.screenshot({
    path: `/tmp/travel-audit/popup-pin-${i}.png`,
    clip: { x: 0, y: 0, width: 1440, height: 600 },
  });

  // Move mouse far away to clear hover before next pin
  await page.mouse.move(50, 850);
  await page.waitForTimeout(450);
}

await browser.close();
