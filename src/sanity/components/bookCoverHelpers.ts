// Shared cover-fetch + Sanity asset upload logic used by both the book
// lookup (single-click metadata + cover) and the alternate cover picker.

import type { SanityClient } from "@sanity/client";

// Decode the blob with the browser's Image API to confirm it's a real image
// before sending it to Sanity. Catches truncated downloads, HTML error
// pages mislabeled as images, etc.
async function validateImageBlob(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const ok = img.naturalWidth > 0 && img.naturalHeight > 0;
      URL.revokeObjectURL(url);
      ok ? resolve() : reject(new Error("Image decoded to 0×0 — corrupt"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image failed to decode (not a valid image)"));
    };
    img.src = url;
  });
}

// Fetch image bytes for a URL through our same-origin proxy (which handles
// CORS for Google Books image hosts). Times out after timeoutMs.
export async function fetchCoverFromUrl(
  url: string,
  timeoutMs = 10000,
): Promise<Blob> {
  const proxyUrl = `/api/cover-proxy?url=${encodeURIComponent(url)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`Cover fetch failed: ${res.status}`);
    const blob = await res.blob();
    if (blob.size < 1000) throw new Error("Cover image looks empty");
    if (!blob.type.startsWith("image/"))
      throw new Error(`Got non-image response (${blob.type})`);
    return blob;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Upload a blob to Sanity and return only when the asset is ready to be
// referenced safely:
//   1) Sanity finished processing (metadata.lqip exists)
//   2) Common preview URLs are pre-warmed on their CDN so Studio doesn't
//      hit a cold cache on first render after the patch
// Returns the Sanity asset _id.
export async function uploadAndWaitForReady(
  client: SanityClient,
  blob: Blob,
  filename: string,
): Promise<string> {
  await validateImageBlob(blob);
  const asset = await client.assets.upload("image", blob, { filename });

  for (let i = 0; i < 20; i++) {
    const fresh = await client.fetch<{
      url?: string;
      metadata?: { lqip?: string };
    } | null>(`*[_id == $id][0]{ url, metadata }`, { id: asset._id });

    if (fresh?.url && fresh?.metadata?.lqip) {
      await Promise.allSettled([
        fetch(fresh.url, { method: "HEAD", cache: "no-store" }),
        fetch(`${fresh.url}?w=200&h=300&fit=crop`, {
          method: "HEAD",
          cache: "no-store",
        }),
        fetch(`${fresh.url}?w=400&h=600&fit=crop`, {
          method: "HEAD",
          cache: "no-store",
        }),
      ]);
      return asset._id;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Sanity took too long to process the image");
}
