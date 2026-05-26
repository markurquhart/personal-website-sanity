// Google Books cover helpers for the Studio book editor.
//
// Two responsibilities:
//   1. Build the canonical high-res Google Books cover URL for a volume.
//   2. Download those bytes (via the same-origin proxy, since Google's image
//      CDN has no CORS headers) and upload them as a Sanity image asset.

import type { SanityClient } from "@sanity/client";

import { studioPublicSiteUrl } from "../studioEnv";

// Build a Google Books content URL for a volume at a given zoom. Zoom 3 is a
// large frontcover (~600×900px-ish, depending on the source scan); zoom 2 is
// medium; zoom 1 is the small thumbnail. We strip the &edge=curl param that
// Google's thumbnail URLs sometimes carry — it draws a fake page curl on top
// of the cover, which we don't want.
export function googleCoverUrl(volumeId: string, zoom: 1 | 2 | 3 = 3): string {
  return `https://books.google.com/books/content?id=${encodeURIComponent(
    volumeId,
  )}&printsec=frontcover&img=1&zoom=${zoom}&source=gbs_api`;
}

// Decode the blob through the browser's <img> pipeline. Confirms the bytes
// are a real image AND returns the natural dimensions so the caller can
// distinguish a real cover from Google's "Image not available" placeholder
// (the placeholder is 128×~180; a real zoom=3 cover is 400px+ wide).
function decodeImage(
  blob: Blob,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      URL.revokeObjectURL(url);
      if (w > 0 && h > 0) resolve({ width: w, height: h });
      else reject(new Error("Cover decoded to 0×0 — file is corrupt"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Cover failed to decode (not a valid image)"));
    };
    img.src = url;
  });
}

function coverProxyUrl(upstream: string): string {
  const proxyUrl = new URL("/api/cover-proxy", studioPublicSiteUrl);
  proxyUrl.searchParams.set("url", upstream);
  return proxyUrl.toString();
}

// Fetch image bytes through the same-origin proxy. Validates the response
// shape so we don't pass HTML or partial data downstream.
export async function fetchGoogleCover(
  volumeId: string,
  zoom: 1 | 2 | 3 = 3,
  timeoutMs = 15000,
): Promise<Blob> {
  const upstream = googleCoverUrl(volumeId, zoom);
  const proxyUrl = coverProxyUrl(upstream);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`Cover fetch failed (${res.status})`);
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) {
      throw new Error(`Unexpected response type (${blob.type || "unknown"})`);
    }
    const { width, height } = await decodeImage(blob);
    // Google serves an "Image not available" placeholder (≈128×180px) for
    // volumes with no real scan. A real zoom=3 cover is 400px+ wide, so we
    // reject anything below that as the placeholder rather than uploading
    // junk to Sanity.
    if (width < 256 || height < 256) {
      throw new Error("Google has no usable cover for this volume");
    }
    return blob;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Fetch an Open Library cover by its numeric cover id (the `cover_i` field
// on OL search results). `?default=false` tells OL to 404 rather than
// returning a 1×1 placeholder when the id resolves to nothing.
export async function fetchOpenLibraryCover(
  coverId: string | number,
  timeoutMs = 15000,
): Promise<Blob> {
  const upstream = `https://covers.openlibrary.org/b/id/${encodeURIComponent(
    String(coverId),
  )}-L.jpg?default=false`;
  const proxyUrl = coverProxyUrl(upstream);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Open Library cover unavailable (${res.status})`);
    }
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) {
      throw new Error(`Unexpected response type (${blob.type || "unknown"})`);
    }
    const { width, height } = await decodeImage(blob);
    if (width < 256 || height < 256) {
      throw new Error("Open Library cover is too small to use");
    }
    return blob;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Upload a verified blob to Sanity as an image asset and return the asset id.
//
// After the upload resolves we also poll until the asset document is
// queryable via the API. Sanity's image-input preview subscribes to the
// asset doc to render its thumbnail; if we patch the field's `_ref`
// before that doc has propagated, the preview gets stuck in "Loading…".
// Warming Studio's listener cache with an explicit fetch first means the
// preview can resolve the reference immediately.
export async function uploadCoverBlob(
  client: SanityClient,
  blob: Blob,
  filename: string,
): Promise<string> {
  const asset = await client.assets.upload("image", blob, { filename });
  if (!asset?._id) {
    throw new Error("Sanity upload returned no asset id");
  }
  const start = Date.now();
  const deadline = start + 6000;
  while (Date.now() < deadline) {
    try {
      const doc = await client.fetch<{ url?: string } | null>(
        `*[_id == $id][0]{url}`,
        { id: asset._id },
      );
      if (doc?.url) return asset._id;
    } catch {
      // ignore transient query errors and retry
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  // Fall back to the asset id even if the warmup didn't complete — the
  // patch will still work; the preview may briefly show "Loading…".
  return asset._id;
}
