import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1500);
const div = await p.evaluate(() => {
  const els = Array.from(document.querySelectorAll('div[aria-hidden]'));
  const target = els.find(e => {
    const cs = getComputedStyle(e);
    return cs.position === 'fixed' && cs.width === '1px';
  });
  if (!target) return { found: false };
  const r = target.getBoundingClientRect();
  return {
    found: true,
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    viewport: { w: window.innerWidth, h: window.innerHeight },
    bg: getComputedStyle(target).backgroundColor,
    position: getComputedStyle(target).position,
  };
});
console.log(JSON.stringify(div, null, 2));
await b.close();
