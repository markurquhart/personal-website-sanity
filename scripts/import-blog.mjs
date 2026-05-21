// Scrape https://markurquhart.com/blog and import all posts into Sanity.
// Run: SANITY_TOKEN=<token> node scripts/import-blog.mjs

import { createClient } from "@sanity/client";
import { JSDOM } from "jsdom";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "<project-id>";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_TOKEN;
if (!token) {
  console.error("Set SANITY_TOKEN env var");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2026-05-20",
  token,
  useCdn: false,
});

const PROD_BLOG = "https://www.markurquhart.com/blog";

function parseDate(str) {
  // "April 4, 2026" -> "2026-04-04"
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function bgUrl(style) {
  if (!style) return null;
  const m = style.match(/url\(['"]?(.*?)['"]?\)/);
  return m ? m[1].replace(/&quot;/g, "") : null;
}

async function uploadFromUrl(url, filename) {
  console.log(`    fetching ${url.slice(0, 80)}…`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return client.assets.upload("image", buf, { filename });
}

async function scrapeIndex() {
  const html = await (await fetch(PROD_BLOG)).text();
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const posts = [];

  // Featured post
  const feat = doc.querySelector(".blog-feat");
  if (feat) {
    const a = feat;
    const img = feat.querySelector(".blog-feat-img");
    posts.push({
      slug: a.getAttribute("href").replace(/^\/blog\//, ""),
      category: feat.querySelector(".blog-cat-tag")?.textContent.trim(),
      title: feat.querySelector(".blog-feat-title")?.textContent.trim(),
      excerpt: feat.querySelector(".blog-feat-excerpt")?.textContent.trim(),
      date: feat.querySelector(".blog-date")?.textContent.trim(),
      readTime: feat.querySelector(".blog-read")?.textContent.trim(),
      coverUrl: bgUrl(img?.getAttribute("style")),
      featured: true,
    });
  }

  // Grid cards
  doc.querySelectorAll(".blog-card-v2").forEach((card) => {
    const img = card.querySelector(".blog-card-img");
    posts.push({
      slug: card.getAttribute("href").replace(/^\/blog\//, ""),
      category: card.querySelector(".blog-cat-tag")?.textContent.trim(),
      title: card.querySelector(".blog-card-ttl")?.textContent.trim(),
      excerpt: card.querySelector(".blog-card-desc")?.textContent.trim(),
      date: card.querySelector(".blog-date")?.textContent.trim(),
      readTime: card.querySelector(".blog-read")?.textContent.trim(),
      coverUrl: bgUrl(img?.getAttribute("style")),
      featured: false,
    });
  });

  return posts;
}

async function main() {
  console.log("→ Scraping blog index from prod…");
  const posts = await scrapeIndex();
  console.log(`  found ${posts.length} posts`);

  console.log("→ Wiping existing posts…");
  const existing = await client.fetch(`*[_type == "post"]._id`);
  for (const id of existing) await client.delete(id);
  console.log(`  removed ${existing.length} posts`);

  console.log("→ Importing posts…");
  let i = 0;
  for (const p of posts) {
    i++;
    console.log(`\n  [${i}/${posts.length}] ${p.title}`);
    if (!p.coverUrl) {
      console.log("    (no cover)");
      continue;
    }
    const filename = `cover-${p.slug}.jpg`;
    const asset = await uploadFromUrl(p.coverUrl, filename);
    const publishedAt = parseDate(p.date);
    const readMin = parseInt((p.readTime || "").match(/\d+/)?.[0] || "0");

    const doc = {
      _type: "post",
      title: p.title,
      slug: { _type: "slug", current: p.slug },
      category: p.category,
      excerpt: p.excerpt,
      publishedAt: publishedAt ? `${publishedAt}T12:00:00Z` : undefined,
      readTime: readMin || undefined,
      featured: p.featured,
      coverImage: {
        _type: "image",
        asset: { _type: "reference", _ref: asset._id },
        alt: p.title,
      },
      body: [
        {
          _type: "block",
          _key: "b1",
          style: "normal",
          markDefs: [],
          children: [
            { _type: "span", _key: "s1", text: p.excerpt, marks: [] },
          ],
        },
      ],
    };
    await client.create(doc);
    console.log(`    ✓ created`);
  }
  console.log("\n✓ Done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
