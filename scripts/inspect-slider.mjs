import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);

const result = await page.evaluate(() => {
  const pag = document.querySelector(".swiper-pagination");
  const prev = document.querySelector(".swiper-button-prev");
  const next = document.querySelector(".swiper-button-next");
  return {
    paginationHTML: pag?.outerHTML.slice(0, 1000) ?? "none",
    paginationStyle: pag ? getComputedStyle(pag).cssText.slice(0, 500) : "none",
    prevHTML: prev?.outerHTML.slice(0, 500) ?? "none",
    nextHTML: next?.outerHTML.slice(0, 500) ?? "none",
    nextPosition: next ? next.getBoundingClientRect() : null,
    swiperBox: document.querySelector(".swiper")?.getBoundingClientRect() ?? null,
  };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
