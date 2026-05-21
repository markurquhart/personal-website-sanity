// One-off: create the homePage doc from existing siteSettings.bio + photo docs.
// Run: SANITY_TOKEN=<token> node scripts/migrate-to-homepage.mjs

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
  apiVersion: "2026-05-20",
  token,
  useCdn: false,
});

async function main() {
  console.log("→ Loading current siteSettings…");
  const settings = await client.fetch(`*[_type == "siteSettings"][0]`);
  const bio = settings?.bio;
  console.log(`  bio: ${bio?.slice(0, 60)}…`);

  console.log("→ Loading photos…");
  const photos = await client.fetch(
    `*[_type == "photo"] | order(takenAt asc){_id, location, takenAt}`,
  );
  console.log(`  found ${photos.length} photos`);

  console.log("→ Creating homePage doc…");
  await client.createOrReplace({
    _id: "homePage",
    _type: "homePage",
    intro: bio,
    heroPhotos: photos.map((p, i) => ({
      _key: `hp${i}`,
      _type: "reference",
      _ref: p._id,
    })),
    sections: [],
  });
  console.log(`  ✓ homePage created with ${photos.length} hero photo refs`);

  console.log("→ Removing bio field from siteSettings…");
  if (settings && bio !== undefined) {
    await client.patch(settings._id).unset(["bio"]).commit();
    console.log(`  ✓ stripped bio from ${settings._id}`);
  }

  console.log("\n✓ Done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
