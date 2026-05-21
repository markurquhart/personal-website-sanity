// Finish photo -> homeSlide migration:
// 1) Discard drafts.homePage (it still has stale refs)
// 2) Re-create the draft from the published homePage (which already has the correct refs)
//    -- actually just delete the draft; user can re-edit later from the published version
// 3) Delete orphan photo docs

import { createClient } from "@sanity/client";

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
  apiVersion: "2026-05-21",
  token,
  useCdn: false,
  perspective: "raw",
});

async function main() {
  console.log("→ Checking for drafts.homePage…");
  const draftHome = await client.fetch(`*[_id == "drafts.homePage"][0]`);
  if (draftHome) {
    console.log(`  found: ${draftHome._id}, deleting…`);
    await client.delete("drafts.homePage");
    console.log("  ✓ draft deleted");
  } else {
    console.log("  none");
  }

  console.log("→ Deleting orphan photo docs…");
  const photos = await client.fetch(`*[_type == "photo"]{_id, location}`);
  for (const p of photos) {
    try {
      await client.delete(p._id);
      console.log(`  ✓ ${p._id} (${p.location})`);
    } catch (e) {
      console.log(`  ✗ ${p._id}: ${e.message?.slice(0, 100)}`);
    }
  }

  console.log("\n✓ Done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
