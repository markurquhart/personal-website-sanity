# Standalone Studio on `studio.markurquhart.com`

This repo now treats Sanity Studio as a standalone static app instead of embedding
it inside the public Next.js site.

## Why this setup

- Keeps Studio out of the public-site app shell
- Prevents GTM/Braze and other site scripts from loading in Studio
- Lets `markurquhart.com` and `studio.markurquhart.com` deploy independently
- Preserves one shared source of truth for schemas, structure, and Studio inputs

## Local development

Run the public site and Studio separately:

```bash
npm run dev
# http://localhost:3000

npm run studio:dev
# http://localhost:3333
```

In development, the public app defaults `NEXT_PUBLIC_SANITY_STUDIO_URL` to
`http://localhost:3333`, so any Studio redirect or stega link resolves to the
local Studio server unless you override it.

## Public app behavior

- `/studio` and `/studio/*` now redirect to the configured Studio URL
- Visual-editing metadata points to `NEXT_PUBLIC_SANITY_STUDIO_URL`
- The public site no longer renders Studio via `NextStudio`

## Vercel project setup

Create a second Vercel project from the same GitHub repo.

### Studio project settings

- **Framework preset:** Other
- **Root directory:** repo root
- **Install command:** `npm install`
- **Build command:** `npm run studio:build`
- **Output directory:** `studio-static`

### Studio project environment variables

- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SANITY_API_VERSION`

Add any future Studio-only secrets here instead of the public-site Vercel project.

## DNS and domain cutover

1. Add `studio.markurquhart.com` in the Studio Vercel project's Domains settings
2. Create the DNS record Vercel requests
3. Wait for Vercel to issue the certificate
4. Confirm the Studio deploy is reachable on the subdomain

## Sanity project settings

In `sanity.io/manage`:

1. Add `https://studio.markurquhart.com` to **API → CORS Origins**
2. Keep the public site origins as needed for frontend reads/previews
3. Verify Studio login succeeds from the new subdomain

## Public-site Vercel settings

Set:

```bash
NEXT_PUBLIC_SANITY_STUDIO_URL=https://studio.markurquhart.com
```

This keeps redirects and stega links aligned with production Studio.

## Verification checklist

After cutover, verify:

1. `https://studio.markurquhart.com` loads and signs in successfully
2. Editing a document no longer triggers GTM/Braze requests from the public site
3. Image uploads and custom book import actions still work
4. `https://markurquhart.com/studio` redirects to `https://studio.markurquhart.com`
5. Visual-editing links resolve to the Studio subdomain instead of `/studio`
