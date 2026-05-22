// Google Books cover helpers for the Studio book editor.
//
// Two responsibilities:
//   1. Build the canonical high-res Google Books cover URL for a volume.
//   2. Download those bytes (via the same-origin proxy, since Google's image
//      CDN has no CORS headers) and upload them as a Sanity image asset.

import type { SanityClient } from "@sanity/client";

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

// Fetch image bytes through the same-origin proxy. Validates the response
// shape so we don't pass HTML or partial data downstream.
export async function fetchGoogleCover(
  volumeId: string,
  zoom: 1 | 2 | 3 = 3,
  timeoutMs = 15000,
): Promise<Blob> {
  const upstream = googleCoverUrl(volumeId, zoom);
  const proxyUrl = `/api/cover-proxy?url=${encodeURIComponent(upstream)}`;

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

// Upload a verified blob to Sanity as an image asset and return the asset id.
// Per Sanity's documented pattern: validate the blob client-side (we already
// did above), then trust client.assets.upload's resolution.
export async function uploadCoverBlob(
  client: SanityClient,
  blob: Blob,
  filename: string,
): Promise<string> {
  const asset = await client.assets.upload("image", blob, { filename });
  if (!asset?._id) {
    throw new Error("Sanity upload returned no asset id");
  }
  return asset._id;
}
