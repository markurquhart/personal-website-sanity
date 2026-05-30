# markurquhart.com

Personal site for [Mark Urquhart](https://markurquhart.com) — a reading log, an interactive travel map, a blog, and a photo slider, all self-managed through a headless CMS.

- **Live site:** https://markurquhart.com
- **CMS Studio:** https://studio.markurquhart.com

---

## For visitors

A guided tour of what's on the site.

### Home

A photo slider of places I've been, with locations, dates, and short captions. Underneath the hero, a short bio and links out to everything else.

### Blog

Long-form writing across a few categories — Technology, Marketing, Sports, Integrations, and Software. The index is searchable, filterable by category, and sortable. Individual posts have rich text, images, code, and a clean reading layout.

### Library

A Goodreads-style shelf of what I'm reading, what's next, what I've finished, and a TBR pile. Completed books get star ratings, a short review, and a "More like this" suggestion section based on shared genres and authors. Books can be imported in one click in the Studio by searching Google Books — covers and metadata come over automatically.

### Travel

An interactive world map of every trip, with pins that cluster when zoomed out and expand when you click them. Each pin opens a popup with the trip summary; the table below auto-filters to show only the trips visible in the current map view (Airbnb-style). Filter by category (Personal / Family / Work) and year, sort by city, state, country, category, or dates. Each trip has its own page with dates, a write-up, a mini-map, a photo gallery, and links to any related blog posts.

---

## For developers

### Stack at a glance

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| CMS | Sanity v5 (standalone Studio on a separate subdomain) |
| Map | MapLibre GL JS + Carto Positron tiles (free, no API key) |
| Geocoding | OpenStreetMap Nominatim (Studio location picker) |
| Icons | Iconify (editor-picked icons for sidebar nav) |
| Slider | Swiper |
| Hosting | Vercel (one project for the site, one for Studio) |
| Analytics | Google Tag Manager (opt-in via env var) |

### Local development

```bash
# Install
npm install

# Public site (Next.js)
npm run dev
# → http://localhost:3000

# Sanity Studio (separately, for content editing)
npm run studio:dev
# → http://localhost:3333
```

### Environment variables

Copy from the Sanity project dashboard and Vercel project settings. `.env*` is gitignored — never commit values.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | yes | Sanity project ID |
| `NEXT_PUBLIC_SANITY_DATASET` | yes | Sanity dataset name |
| `NEXT_PUBLIC_SANITY_API_VERSION` | yes | Pin to a recent date, e.g. `2026-05-30` |
| `SANITY_API_READ_TOKEN` | optional | Draft preview / authenticated reads |
| `NEXT_PUBLIC_SANITY_STUDIO_URL` | optional | Defaults: `http://localhost:3333` in dev, `https://studio.markurquhart.com` in prod |
| `NEXT_PUBLIC_GTM_ID` | optional | GTM ID — leave unset in dev so test events don't fire |
| `SANITY_TOKEN` | optional | Write token, only needed when running migration scripts |

### Project layout

```
src/
├── app/
│   ├── page.tsx                    # Home
│   ├── blog/                       # Index + post detail
│   ├── library/                    # Books index + book detail
│   ├── travel/                     # Trips index + trip detail
│   ├── studio/                     # Embedded Studio fallback (prod redirects to subdomain)
│   ├── api/                        # Cover-image proxy, Studio redirect helpers
│   ├── layout.tsx                  # Root layout + fonts + GTM
│   └── globals.css                 # Tailwind entry + small overrides
├── components/                     # All UI — PageShell, NavSidebar, BookListItem,
│                                   # TripCard, TripTable, TravelMap, etc.
├── lib/                            # Shared non-UI helpers
│                                   # (navLink, navIcon, tripCategory)
└── sanity/
    ├── env.ts                      # Project / dataset / API version
    ├── lib/                        # client, live, image, queries, types
    ├── components/                 # Custom Studio inputs (see below)
    ├── schemaTypes/
    │   ├── documents/              # Doc-type schemas (see Content model)
    │   ├── objects/                # navLink, siteNavigation
    │   └── constants/              # Shared lookup tables
    └── structure.ts                # Studio sidebar structure
sanity.config.ts                    # Standalone Studio config
sanity.cli.ts                       # Studio CLI config
scripts/                            # Migration + Playwright audit scripts
docs/                               # Operational docs (Studio cutover, etc.)
```

### Content model

| Type | Kind | Purpose |
|---|---|---|
| `siteSettings` | singleton | Title, tagline, avatar, footer text, and sidebar navigation (with Iconify-picked icons) |
| `homePage` | singleton | Intro paragraph + ordered references to hero slides |
| `homeSlide` | asset | One slide in the home hero (image, location, date, caption) |
| `post` | entry | Blog post (title, slug, category, excerpt, cover, Portable Text body, etc.) |
| `book` | entry | A book with status, kind, genres, rating, favorite flag, summary, Portable Text review, external links |
| `trip` | entry | A trip with geopoint location, city/state/country, dates, category, summary, Portable Text body, photo refs, related post refs |
| `tripPhoto` | asset | A photo attached to a trip (image, caption, date, location) |

The Studio is grouped:

```
Pages          → Home
Entries        → Blog Posts, Books, Trips
Assets         → Home Sliders, Trip Photos
Site Settings  → Singleton
```

### Custom Studio inputs

Live under `src/sanity/components/`:

| Input | Field | What it does |
|---|---|---|
| `BookCoverInput` | `book.cover` | Search Google Books / Open Library / upload — one-click cover import via the Vercel-hosted CORS proxy |
| `BookImportAction` / `BookImportDialog` | document action | Bulk-create books from a Google Books search |
| `LocationPickerInput` | `trip.location` | MapLibre map with click-to-drop pin, drag-to-refine, and Nominatim place search |
| `NavIconifyInput` | `navLink.icon` | Iconify icon picker for sidebar nav links |

### Common tasks

| Task | How |
|---|---|
| Edit content | Open Studio (local or prod) and sign in |
| Add a new doc type | Add `src/sanity/schemaTypes/documents/<name>.ts`, register it in `index.ts`, add to `structure.ts`, then `npm run schema:deploy` |
| Deploy schema | `npm run schema:deploy` |
| Build standalone Studio | `npm run studio:build` (outputs `studio-static/`) |
| Generate types | `npm run typegen` (placeholder — types are still hand-rolled in `src/sanity/lib/types.ts`) |
| Run a Playwright audit | `node scripts/audit-<name>.mjs` against a local `npm run dev` server |

### Scripts

All scripts live in `scripts/` and expect `SANITY_TOKEN` (write token) plus the Sanity env vars when they touch content.

**Imports** — one-shots from the old Webflow site:
- `import-from-webflow.mjs` — avatar + 7 hero photos, seeded `siteSettings`
- `import-blog.mjs` — 17 blog posts (title, category, cover, excerpt, date, read time)

**Migrations** — schema/content moves:
- `migrate-to-homepage.mjs` — bio from `siteSettings` → `homePage.intro`, created hero photo refs
- `migrate-photo-to-homeslide.mjs` — renamed `photo` doc type → `homeSlide`
- `cleanup-photo-migration.mjs` — discarded stale drafts, deleted orphans from the above
- `migrate-nav-groups.mjs` / `migrate-nav-iconify.mjs` — moved nav to grouped, Iconify-icon links
- `remove-book-history.mjs` — pruned a deprecated book sub-field

**Audits** — Playwright screenshots / DOM inspections for regression checking:
- `audit.mjs`, `audit2.mjs` — home page across viewports
- `audit-blog.mjs`, `audit-book.mjs` — blog and library detail pages
- `audit-travel.mjs`, `audit-popup.mjs`, `audit-popup-positions.mjs`, `audit-cluster.mjs`, `audit-bounds.mjs` — travel map flow (pins, popups, clustering, viewport sync)
- `inspect-slider.mjs`, `check-divider.mjs`, `debug-popup.mjs` — ad-hoc debug helpers

### Responsive layout

- **≥ 1280px (`xl:`):** Two-column. Fixed 280px sidebar (avatar, name, bio, nav, copyright), full-viewport-height divider, content takes the rest.
- **< 1280px:** Single column. Sticky header with logo + hamburger, inline profile, edge-to-edge sliders, slide-in nav drawer.

The `lg:` breakpoint was deliberately swapped for `xl:` — the sidebar at 1024–1279px was too cramped.

### Deploy

Two Vercel projects from the same repo:

**Public site** — default `next build`, auto-deploys from `main`. Custom domain `markurquhart.com`.

**Standalone Studio** — Framework preset "Other", build `npm run studio:build`, output `studio-static`, install `npm install`. Custom domain `studio.markurquhart.com`. Set `NEXT_PUBLIC_SANITY_*` env vars on this project too.

After either deploys:
1. Add the URL to **Sanity CORS** (`https://sanity.io/manage` → API → CORS)
2. Set `NEXT_PUBLIC_SANITY_STUDIO_URL=https://studio.markurquhart.com` on the public-site project so `/studio` redirects properly

Full cutover details: [`docs/studio-subdomain.md`](./docs/studio-subdomain.md).

### Conventions

See [`AGENTS.md`](./AGENTS.md) for the layout, responsive, schema, analytics, and migration-script rules. It's loaded automatically into Claude Code / Cursor sessions on this repo and is the canonical guide before adding any new component, section, page, or doc type.
