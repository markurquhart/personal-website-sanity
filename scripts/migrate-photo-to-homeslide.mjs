// Rename document type photo -> homeSlide. Re-creates docs and updates
// homePage.heroPhotos references so nothing breaks.
// Run: SANITY_TOKEN=<token> node scripts/migrate-photo-to-homeslide.mjs

import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
if (!projectId || !dataset) {
  console.error("Set NEXT_PUBLIC_SANITY_PROJECT_ID and NEXT_PUBLIC_SANITY_DATASET env vars");
  process.exit(1);
}
const token = process.env.SANITY_TOKEN;
if (!token) {
  console.error("Set SANITY_TOKEN env var");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2026-05-21",
  token,
  useCdn: false,
});

async function main() {
  console.log("→ Fetching existing photo docs…");
  const photos = await client.fetch(
    `*[_type == "photo"]{_id, image, location, takenAt, caption}`,
  );
  console.log(`  found ${photos.length}`);
  if (photos.length === 0) {
    console.log("Nothing to migrate.");
    return;
  }

  console.log("→ Creating homeSlide docs with same data…");
  const idMap = {};
  for (const p of photos) {
    const created = await client.create({
      _type: "homeSlide",
      image: p.image,
      location: p.location,
      takenAt: p.takenAt,
      caption: p.caption,
    });
    idMap[p._id] = created._id;
    console.log(`  ${p._id} -> ${created._id} (${p.location})`);
  }

  console.log("→ Updating homePage.heroPhotos refs…");
  const homePage = await client.fetch(`*[_type == "homePage"][0]`);
  if (homePage?.heroPhotos?.length) {
    const updated = homePage.heroPhotos.map((ref, i) => ({
      _key: ref._key || `hp${i}`,
      _type: "reference",
      _ref: idMap[ref._ref] || ref._ref,
    }));
    await client
      .patch(homePage._id)
      .set({ heroPhotos: updated })
      .commit();
    console.log(`  patched ${updated.length} refs`);
  }

  console.log("→ Deleting old photo docs…");
  for (const p of photos) {
    await client.delete(p._id);
  }
  console.log(`  removed ${photos.length}`);

  console.log("\n✓ Done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
