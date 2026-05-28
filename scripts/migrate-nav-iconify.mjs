// Convert navigation link icons from legacy strings → Iconify { _type: "icon", name }.
// Run: node scripts/migrate-nav-iconify.mjs  (with .env.local loaded)

import { createClient } from "@sanity/client";

const LEGACY_NAV_ICON_MAP = {
  linkedin: "simple-icons:linkedin",
  github: "simple-icons:github",
  webflow: "simple-icons:webflow",
  instagram: "simple-icons:instagram",
  threads: "simple-icons:threads",
  email: "lucide:mail",
  goodreads: "simple-icons:goodreads",
  strava: "simple-icons:strava",
  lastfm: "simple-icons:lastdotfm",
  blog: "lucide:newspaper",
  book: "lucide:book-open",
};

const GROUPS = ["pages", "professional", "social", "lifestyle"];

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID;
const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_STUDIO_DATASET;
const token = process.env.SANITY_TOKEN;

if (!projectId || !dataset) {
  console.error("Set NEXT_PUBLIC_SANITY_PROJECT_ID and NEXT_PUBLIC_SANITY_DATASET");
  process.exit(1);
}
if (!token) {
  console.error("Set SANITY_TOKEN in .env.local");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-05-20",
  token,
  useCdn: false,
});

function toIconify(icon) {
  if (!icon) return icon;
  if (typeof icon === "object" && icon._type === "icon" && icon.name) {
    return icon;
  }
  if (typeof icon === "string") {
    const name = icon.includes(":")
      ? icon
      : LEGACY_NAV_ICON_MAP[icon] ?? `mdi:${icon}`;
    return { _type: "icon", name };
  }
  return icon;
}

function migrateNavigation(navigation) {
  if (!navigation) return navigation;
  const next = { ...navigation };
  let changed = 0;
  for (const group of GROUPS) {
    const links = navigation[group];
    if (!Array.isArray(links)) continue;
    next[group] = links.map((link) => {
      const icon = toIconify(link.icon);
      if (icon !== link.icon) changed += 1;
      return { ...link, icon };
    });
  }
  return { navigation: next, changed };
}

async function main() {
  const settings = await client.fetch(`*[_type == "siteSettings"][0]`);
  if (!settings?._id) {
    console.error("No siteSettings document found");
    process.exit(1);
  }

  const { navigation: nextNav, changed } = migrateNavigation(settings.navigation);
  if (changed === 0) {
    console.log("✓ All nav icons already use Iconify format");
    return;
  }

  await client.patch(settings._id).set({ navigation: nextNav }).commit();
  console.log(`✓ Updated ${changed} link icon(s) to Iconify format`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
