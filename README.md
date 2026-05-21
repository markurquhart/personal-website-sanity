# markurquhart.com

Personal site for [Mark Urquhart](https://markurquhart.com) — Next.js 16 + Sanity v5, deployed on Vercel. Migrated from Webflow.

## Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **CMS:** Sanity v5 (embedded Studio at `/studio`)
- **Styling:** Tailwind CSS v4
- **Slider:** Swiper
- **Hosting:** Vercel
- **Analytics:** Google Tag Manager (opt-in via env var)

## Project layout

```
src/
├── app/
│   ├── page.tsx                  # Home (hero slider)
│   ├── blog/
│   │   ├── page.tsx              # Blog index (filters + sort + featured + grid)
│   │   └── [slug]/page.tsx       # Post detail
│   ├── studio/[[...tool]]/       # Embedded Sanity Studio
│   └── layout.tsx                # Root layout + fonts + GTM
├── components/
│   ├── PageShell.tsx             # Responsive shell (sidebar / mobile header)
│   ├── NavSidebar.tsx            # Desktop sidebar (≥ 1280px)
│   ├── MobileShell.tsx           # Mobile header, footer, slide-in nav
│   ├── PhotoSlider.tsx           # Home slider (Swiper)
│   ├── BlogContent.tsx           # Blog index UI + filter/sort state
│   ├── SocialIcon.tsx            # SVG icon registry
│   └── GoogleTagManager.tsx      # GTM script + noscript
└── sanity/
    ├── env.ts                    # Project / dataset / API version
    ├── lib/
    │   ├── client.ts             # Sanity client
    │   ├── live.ts               # defineLive (sanityFetch, SanityLive)
    │   ├── image.ts              # Image URL builder
    │   ├── queries.ts            # All GROQ queries
    │   └── types.ts              # Hand-typed shapes (no typegen yet)
    ├── schemaTypes/
    │   ├── index.ts              # Exports all schema types
    │   ├── documents/
    │   │   ├── homePage.ts       # Singleton: intro, heroPhotos refs, sections
    │   │   ├── homeSlide.ts      # One slide in the home hero
    │   │   ├── post.ts           # Blog post
    │   │   └── siteSettings.ts   # Singleton: title, tagline, avatar, socials, footer
    │   └── objects/
    │       └── socialLink.ts     # Social link sub-object
    └── structure.ts              # Studio structure: Pages, Entries, Assets, Site Settings
sanity.config.ts                  # Studio config
sanity.cli.ts                     # CLI config (project id / dataset)
scripts/                          # One-off migration + audit scripts
```

## Content model

| Doc type | Purpose |
|---|---|
| `siteSettings` | Site-wide singleton: site title, tagline, avatar, social links, footer text |
| `homePage` | Home page singleton: intro paragraph, ordered hero photo refs, optional sections |
| `homeSlide` | Individual slide in the home hero (image + location + date + caption) |
| `post` | Blog post: title, slug, category, excerpt, cover, body (Portable Text), publishedAt, readTime, featured flag |

Studio is organized as:

```
Pages       → Home
Entries     → Blog Posts          (future entry types slot here)
Assets      → Home Sliders        (future asset types slot here)
Site Settings
```

## Local development

```bash
# Install
npm install

# Environment (copy and fill in)
cp .env.local.example .env.local   # if you set one up; otherwise see "Env vars" below

# Start the dev server
npm run dev
# → http://localhost:3000
# → http://localhost:3000/studio   (Sanity Studio)
```

### Env vars

`.env.local`:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=<project-id>
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2026-05-20

# Optional — required only for draft preview / authenticated reads
SANITY_API_READ_TOKEN=

# Google Tag Manager — leave unset locally so dev events don't fire
# NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

The same vars are set in Vercel (with `NEXT_PUBLIC_GTM_ID` set in Production).

## Common tasks

### Edit content

Open `/studio` (locally or on the deployed URL), sign in with the Sanity account that owns the project.

### Add a new asset or entry type

1. Create the schema file: `src/sanity/schemaTypes/documents/<name>.ts`
2. Add to `src/sanity/schemaTypes/index.ts` (import + add to `types` array)
3. Add to `src/sanity/structure.ts` under the right parent (Entries or Assets) — there are commented examples already
4. Deploy schema: `npm run schema:deploy`
5. Commit + push → Vercel redeploys

### Deploy the schema to Sanity

```bash
npm run schema:deploy
```

This uploads the schema to the Sanity Content Lake so the MCP tools and validation know about it.

### Generate TypeScript types (not yet wired)

```bash
npm run typegen   # currently a placeholder; types.ts is hand-rolled
```

## Scripts in `/scripts`

One-off migration and audit utilities. They expect `SANITY_TOKEN` (write token) in the env.

| Script | Purpose |
|---|---|
| `import-from-webflow.mjs` | Initial import: pulled avatar + 7 hero photos from Webflow CDN, seeded `siteSettings` |
| `import-blog.mjs` | Scraped 17 blog posts from prod Webflow (title, category, cover, excerpt, date, read time) |
| `migrate-to-homepage.mjs` | Moved bio from `siteSettings` → new `homePage.intro`; created hero photo refs |
| `migrate-photo-to-homeslide.mjs` | Renamed `photo` doc type → `homeSlide`; re-created docs and repointed refs |
| `cleanup-photo-migration.mjs` | Cleanup pass for the above (discarded stale drafts, deleted orphans) |
| `audit.mjs`, `audit-blog.mjs`, `audit2.mjs` | Playwright screenshot diffs across viewports |
| `inspect-slider.mjs`, `check-divider.mjs` | Headless DOM measurements while debugging layout |

## Responsive layout

- **≥ 1280px:** Two-column. Fixed 280px sidebar on the left (avatar, name, bio, nav groups, copyright), full-viewport-height divider line, content takes the remaining space.
- **< 1280px:** Single column. Sticky header with `Mark.` + hamburger, inline profile section, edge-to-edge slider, centered footer copyright. The hamburger opens a slide-in nav with the same group structure as desktop.

The `lg:` breakpoint was deliberately swapped for `xl:` (1280px) — the sidebar at 1024–1279px was too cramped to look right.

## Deploy

Vercel auto-deploys from `main`. Build command is the default `next build` — no custom config needed.

After deploying:

1. Add the production URL to **Sanity CORS** (`https://sanity.io/manage` → API → CORS)
2. Custom domain via **Vercel** → Settings → Domains → `markurquhart.com`

## Credits

Original design lifted from the prior Webflow site to ease the transition.
