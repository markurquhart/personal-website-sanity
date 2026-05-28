// Move legacy flat siteSettings.socials[] into siteSettings.navigation.{pages,professional,...}
// Run: SANITY_TOKEN=<token> node scripts/migrate-nav-groups.mjs

import { createClient } from "@sanity/client";

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID;
const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_STUDIO_DATASET;

if (!projectId || !dataset) {
  console.error(
    "Set NEXT_PUBLIC_SANITY_PROJECT_ID and NEXT_PUBLIC_SANITY_DATASET (or SANITY_STUDIO_* equivalents)",
  );
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
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-05-20",
  token,
  useCdn: false,
});

const GROUPS = ["pages", "professional", "social", "lifestyle"];

function stripGroup(link) {
  const { label, url, icon } = link;
  return { label, url, icon };
}

function buildNavigation(socials) {
  const navigation = {
    pages: [],
    professional: [],
    social: [],
    lifestyle: [],
  };
  for (const link of socials ?? []) {
    const group = GROUPS.includes(link.group) ? link.group : "social";
    navigation[group].push({
      _key: link._key || `m-${group}-${navigation[group].length}`,
      ...stripGroup(link),
    });
  }
  return navigation;
}

async function main() {
  console.log("→ Loading siteSettings…");
  const settings = await client.fetch(`*[_type == "siteSettings"][0]`);
  if (!settings?._id) {
    console.error("No siteSettings document found");
    process.exit(1);
  }

  if (settings.navigation && GROUPS.some((g) => settings.navigation[g]?.length)) {
    console.log("  navigation already populated — skipping migration");
    return;
  }

  const socials = settings.socials ?? [];
  if (socials.length === 0) {
    console.log("  no legacy socials to migrate");
    return;
  }

  const navigation = buildNavigation(socials);
  console.log(
    GROUPS.map((g) => `  ${g}: ${navigation[g].length} link(s)`).join("\n"),
  );

  await client
    .patch(settings._id)
    .set({ navigation })
    .unset(["socials"])
    .commit();

  console.log(`\n✓ Migrated ${socials.length} links into navigation and removed socials`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
