// One-off: import avatar + photos from the existing Webflow site into Sanity,
// and rewrite siteSettings with correct labels, urls, and icon mappings.
// Run with: SANITY_TOKEN=<token> node scripts/import-from-webflow.mjs

import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.SANITY_TOKEN;

if (!projectId || !dataset || !token) {
  console.error(
    "Set NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, and SANITY_TOKEN env vars",
  );
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2026-05-20",
  token,
  useCdn: false,
});

const AVATAR_URL =
  "https://cdn.prod.website-files.com/69435fd534ace93e2ccd1f5f/6999d0a9f9f2212f6cb4b762_personal.jpg";

const PHOTOS = [
  {
    url: "https://cdn.prod.website-files.com/69435fd534ace93e2ccd1f5f/69a1d8e10033037d24e61a15_IMG_0219-2.jpg",
    location: "North Conway, NH",
    takenAt: "2026-02-24",
  },
  {
    url: "https://cdn.prod.website-files.com/69435fd534ace93e2ccd1f5f/69b989c099e06701d7411b25_20260317_130048_opt.jpg",
    location: "Merrimack, NH",
    takenAt: "2026-03-17",
  },
  {
    url: "https://cdn.prod.website-files.com/69435fd534ace93e2ccd1f5f/6984a48a75489ff4dff66986_FAA49BC9-BD8B-4831-AF75-56198AF13389.jpg",
    location: "Estes Park, CO",
    takenAt: "2021-11-07",
  },
  {
    url: "https://cdn.prod.website-files.com/69435fd534ace93e2ccd1f5f/696167e9daefeb179279f331_IMG_8821.jpg",
    location: "Munich, Germany",
    takenAt: "2025-12-03",
  },
  {
    url: "https://cdn.prod.website-files.com/69435fd534ace93e2ccd1f5f/69554a54478b3701a68f8bfd_IMG_9099_op.jpg",
    location: "Zurich, Switzerland",
    takenAt: "2025-12-03",
  },
  {
    url: "https://cdn.prod.website-files.com/69435fd534ace93e2ccd1f5f/694718a2c830ec27f3761554_IMG_8550_opt.jpg",
    location: "Napa, CA",
    takenAt: "2025-11-18",
  },
  {
    url: "https://cdn.prod.website-files.com/69435fd534ace93e2ccd1f5f/694393d7853f92bbf7af905f_MGdK6zPOa53KYcVqIPPNaoeKwQ.jpg",
    location: "New York, NY",
    takenAt: "2025-09-03",
  },
];

const SOCIALS = [
  // Professional
  {
    label: "LinkedIn",
    url: "https://www.linkedin.com/in/markurquhart/",
    group: "professional",
    icon: "linkedin",
  },
  {
    label: "Github",
    url: "https://github.com/markurquhart",
    group: "professional",
    icon: "github",
  },
  {
    label: "Website Projects",
    url: "https://webflow.com/@markurquhart",
    group: "professional",
    icon: "webflow",
  },
  // Social
  {
    label: "Instagram",
    url: "https://instagram.com/markurquhart",
    group: "social",
    icon: "instagram",
  },
  {
    label: "Threads",
    url: "https://www.threads.com/@markurquhart",
    group: "social",
    icon: "threads",
  },
  {
    label: "Contact",
    url: "mailto:mwurquha@gmail.com?subject=Contact%20from%20your%20website",
    group: "social",
    icon: "email",
  },
  // Lifestyle
  {
    label: "Currently Reading",
    url: "https://www.goodreads.com/review/list/26286233-mark-urquhart?shelf=currently-reading",
    group: "lifestyle",
    icon: "goodreads",
  },
  {
    label: "Workouts",
    url: "https://www.strava.com/athletes/2227944",
    group: "lifestyle",
    icon: "strava",
  },
  {
    label: "Music",
    url: "https://www.last.fm/user/MarkUrquhart",
    group: "lifestyle",
    icon: "lastfm",
  },
];

async function uploadFromUrl(url, filename) {
  console.log(`  fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`  uploading ${filename} (${(buf.length / 1024).toFixed(0)} kb)`);
  const asset = await client.assets.upload("image", buf, { filename });
  return asset;
}

async function main() {
  console.log("→ Wiping existing photo documents…");
  const existingPhotos = await client.fetch(`*[_type == "photo"]._id`);
  for (const id of existingPhotos) {
    await client.delete(id);
  }
  console.log(`  removed ${existingPhotos.length} photos`);

  console.log("→ Uploading avatar…");
  const avatarAsset = await uploadFromUrl(AVATAR_URL, "avatar.jpg");

  console.log("→ Uploading photos…");
  const photoDocs = [];
  for (const [i, p] of PHOTOS.entries()) {
    const filename = `photo-${i + 1}-${p.location.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.jpg`;
    const asset = await uploadFromUrl(p.url, filename);
    photoDocs.push({
      _type: "photo",
      location: p.location,
      takenAt: p.takenAt,
      image: {
        _type: "image",
        asset: { _type: "reference", _ref: asset._id },
        alt: p.location,
      },
    });
  }

  console.log("→ Creating photo documents…");
  for (const doc of photoDocs) {
    await client.create(doc);
  }
  console.log(`  created ${photoDocs.length} photos`);

  console.log("→ Resetting & writing siteSettings…");
  const existingSettings = await client.fetch(`*[_type == "siteSettings"]._id`);
  for (const id of existingSettings) {
    await client.delete(id);
  }

  await client.createOrReplace({
    _id: "siteSettings",
    _type: "siteSettings",
    title: "Mark",
    tagline:
      "Girl Dad. Solutions Architect. Self-taught Developer, Designer, and Photographer.",
    bio: "Girl Dad. Solutions Architect. Self-taught Developer, Designer, and Photographer. Syracuse alumnus. Boston sports fan.",
    footerText: `© ${new Date().getFullYear()} Mark Urquhart. All rights reserved.`,
    avatar: {
      _type: "image",
      asset: { _type: "reference", _ref: avatarAsset._id },
      alt: "Mark Urquhart",
    },
    navigation: {
      pages: [],
      professional: SOCIALS.filter((s) => s.group === "professional").map(
        (s, i) => ({ _key: `p${i}`, ...(({ group, ...rest }) => rest)(s) }),
      ),
      social: SOCIALS.filter((s) => s.group === "social").map((s, i) => ({
        _key: `s${i}`,
        ...(({ group, ...rest }) => rest)(s),
      })),
      lifestyle: SOCIALS.filter((s) => s.group === "lifestyle").map((s, i) => ({
        _key: `l${i}`,
        ...(({ group, ...rest }) => rest)(s),
      })),
    },
  });

  console.log("✓ Done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
