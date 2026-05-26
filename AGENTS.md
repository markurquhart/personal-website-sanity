<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Layout & Responsive Rules

These rules are non-negotiable. Every new component, section, or page must follow them. Deviating creates the kind of cramped/asymmetric/awkward layouts that take long debugging passes to fix.

## 1. Breakpoint

**Use `xl:` (1280px) as the desktop/mobile divide. Never `lg:` (1024px).**

- < 1280px → stacked mobile layout (Mark.+hamburger header → content → footer)
- ≥ 1280px → sidebar layout (NavSidebar left, main right)

Why: `lg:` (1024px) produces a cramped sidebar that looks broken in the 1024–1279px range. We tested every common width and `xl:` is the right line.

## 2. Always wrap pages in `<PageShell>`

`src/components/PageShell.tsx` is the canonical page wrapper. It handles:

- Mobile sticky header (Mark. logo + hamburger)
- Mobile inline profile (avatar + bio) — pass `hideMobileProfile` to skip
- Desktop sidebar (NavSidebar) with nav groups
- Desktop divider (fixed, full viewport height) at `calc(42px + 280px + 48px)`
- Mobile slide-in nav overlay (MobileSidebar via MobileNav)
- Mobile footer copyright

```tsx
import { PageShell } from "@/components/PageShell";

export default async function MyPage() {
  return (
    <PageShell hideMobileProfile={/* optional */}>
      {/* page content */}
    </PageShell>
  );
}
```

If you need a layout WITHOUT the sidebar (rare — e.g., a landing page), build a sibling component following the same breakpoint and padding rules below. Don't fork or duplicate `PageShell`.

## 3. Content padding inside main

Every block of content that goes inside `<PageShell>` must use:

```tsx
<div className="... px-5 xl:px-0">
```

- Mobile: `px-5` (20px) on each side so text doesn't touch the viewport edge
- Desktop: `xl:px-0` — `PageShell` handles outer padding via its main element's `xl:pl-[42px]`

Exception: **edge-to-edge media** (hero photos, full-bleed sliders, banner images) skip horizontal padding entirely. Do NOT add `xl:px-0` there — it's already implied.

## 4. Never set `font-size` on `<html>`

The `<html>` element must stay at the browser default (16px). All Tailwind `rem`-based utilities (`text-base`, `text-[2.5rem]`, `gap-12`, `p-4`, etc.) are calibrated to a 16px root.

If you set `html { font-size: 14px }`, every rem unit silently shrinks by ~12.5% — gaps tighten, fonts look stunted, paddings shrink. This is the bug that caused the "Blog title and subtitle are too close together" complaint. Don't reintroduce it.

Set body text size on `body` only:

```css
body {
  font-size: 14px;  /* base body font */
  line-height: 1.5;
}
```

## 5. Use explicit pixels for layout-critical spacing

For the outer flex layout where the divider/sidebar math has to line up:

```tsx
xl:gap-[48px]   // not xl:gap-12 — the explicit pixel value is safer
xl:px-[42px]    // outer padding
w-[280px]       // sidebar width, fixed
xl:pl-[42px]    // main left padding (matches outer right padding for symmetric slider margins)
```

For arbitrary content spacing within sections, regular Tailwind scale (`gap-4`, `mt-6`, etc.) is fine.

## 6. Flex layout gotchas

When the main content area is a flex-1 child, you MUST use:

```tsx
<main className="w-full xl:w-auto xl:min-w-0 xl:flex-1 ...">
```

- `xl:w-auto` — overrides the `w-full` you'd otherwise need for mobile, lets flex-1 control width at xl
- `xl:min-w-0` — prevents flex item from overflowing when inner content (wide images, code blocks) tries to push beyond container

Without `xl:min-w-0`, wide content (like a 2400px-wide image) can blow the layout past the viewport.

## 7. Mobile-only / Desktop-only visibility

```tsx
className="xl:hidden"          // shows only on mobile/tablet (< 1280px)
className="hidden xl:flex"     // shows only on desktop (≥ 1280px) — use xl:block or xl:grid as needed
```

These two are the only acceptable visibility patterns for the responsive switch.

## 8. Slider / hero / full-bleed media

- Mobile: full viewport width, no horizontal padding. Pin caption to bottom-center, dots below caption.
- Desktop: takes the flex-1 main width with symmetric 42px margins inside the divider. Caption bottom-left, dots bottom-right.
- Use `<PhotoSlider>` as the reference for any slider pattern.

## 9. Analytics hooks (`data-track`)

Any element you want tracked in Google Tag Manager needs a stable `data-track` attribute. Don't rely on CSS class names — they change when frameworks/libraries update.

```tsx
<button data-track="slider-prev">...</button>
<a data-track="nav-link" data-track-label="LinkedIn">...</a>
```

GTM triggers match on `[data-track="..."]` selectors. There's a `Click - Track Label` DOM Element variable in GTM that reads `data-track-label`.

## 10. Sanity content fetching pattern

Every page that uses `<PageShell>` already fetches `SHELL_QUERY` (settings + home intro) once. If your page needs additional Sanity data, fetch it in the page component (not inside child components) and pass down as props. Keep client components free of Sanity client imports.

```tsx
// app/some-page/page.tsx (server component)
const { data } = await sanityFetch({ query: MY_QUERY });
return <PageShell><MyContent data={data} /></PageShell>;
```

## 11. Verifying responsive work

When you build a new page or section, run the Playwright audit before claiming it's done:

```bash
node scripts/audit.mjs       # captures home at multiple widths
# or write a similar script targeting your new page
```

Required viewports to check: **1440, 1280, 1100, 1024, 768, 600, 390**. The transition at 1280px should be smooth — no cramped sidebar at 1024–1279, no asymmetric margins at 1440+, no missing padding at 390.

# Schema & Studio Rules

## Document type naming

- Singletons: clear page or settings name (`homePage`, `siteSettings`)
- Asset types: descriptive of their primary use (`homeSlide`, future: `headshot`, `projectPhoto`)
- Entry types: content noun (`post`, future: `note`, `project`, `caseStudy`)

Type names use `camelCase`. Display titles (in schema `title:` field) are human-readable.

## Studio structure

Update `src/sanity/structure.ts` to keep the four-group taxonomy:

```
Pages       → singleton documents
Entries     → multi-instance content (posts, notes, etc.)
Assets      → media (sliders, headshots, etc.)
Site Settings
```

Commented placeholder lines in the file show the canonical pattern for adding new types under Entries or Assets.

## References vs nested objects

- **Reusable content** (a photo that might appear in multiple places) → standalone document + `reference` field
- **Document-specific content** (SEO metadata, hero blocks unique to one page) → nested `object` field

When in doubt, prefer reference. It's easier to refactor a reference into a nested object than vice versa.

## Schema deploy

After any schema change, run:

```bash
npm run schema:deploy
```

 The standalone Studio will pick it up on next load. The frontend doesn't care about schema changes unless query shapes change.

# Migration scripts

One-off migration scripts live in `scripts/*.mjs` and require `SANITY_TOKEN` in the env:

```bash
SANITY_TOKEN=<write-token> NEXT_PUBLIC_SANITY_PROJECT_ID=<id> NEXT_PUBLIC_SANITY_DATASET=production node scripts/your-script.mjs
```

When writing a new migration:

1. Read existing docs
2. Create new docs (don't mutate `_type` in place — Sanity rejects that for type-renaming)
3. Patch references that pointed to old docs (including drafts — query with `perspective: "raw"` to catch them)
4. Delete old docs last (after all references are updated)
5. Log progress so failures are obvious

# Things to never do

- Set `font-size` on `<html>`
- Use `lg:` (1024px) for the desktop/mobile responsive switch
- Rely on CSS class names for GTM triggers
- Set arbitrary widths like `w-[20%]` for the sidebar — use `w-[280px]` (fixed) and let main flex-grow
- Add `pr-*` to main on desktop — relies on the outer `px-[42px]` for the right margin (keeps slider symmetric)
- Hardcode the project ID, dataset name, or any token in source files — they go in env vars only
- Skip the Playwright audit on responsive changes
