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

// Fetch image bytes via the same-origin proxy. Validates content-type and
// size; rejects HTML error pages and corrupt downloads.
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

// Upload to Sanity, then VERIFY the asset URL actually serves valid image
// bytes before returning the asset ID. Per Sanity's own troubleshooting:
// uploads can return successfully but produce truncated/incomplete assets
// that Studio then can't render (stuck on "Loading"). The fix is to verify,
// and if the asset is broken, delete it and retry.
//
// Also HEAD-warms the common transformed URLs Studio uses in image previews
// so Studio's first render after the patch hits a warm CDN cache.
export async function uploadAndVerify(
  client: SanityClient,
  blob: Blob,
  filename: string,
): Promise<string> {
  await validateImageBlob(blob);

  for (let attempt = 1; attempt <= 3; attempt++) {
    const asset = await client.assets.upload("image", blob, { filename });
    if (!asset?._id || !asset.url) {
      throw new Error("Sanity returned no asset id/url");
    }

    // Brief wait for Sanity's CDN to start serving the asset
    await new Promise((r) => setTimeout(r, 1500));

    // Verify the asset URL serves valid image bytes
    let verified = false;
    try {
      const verify = await fetch(asset.url, { cache: "no-store" });
      if (verify.ok) {
        const verifyBlob = await verify.blob();
        const validSize = verifyBlob.size >= 1000;
        const validType = verifyBlob.type.startsWith("image/");
        // The verified blob should be roughly the same size as what we
        // uploaded (allow generous tolerance — Sanity may strip metadata).
        const sizeReasonable =
          verifyBlob.size >= blob.size * 0.5 || verifyBlob.size >= 5000;
        verified = validSize && validType && sizeReasonable;
      }
    } catch (e) {
      console.warn(`Asset verification attempt ${attempt} failed:`, e);
    }

    if (verified) {
      // Pre-warm common transformed URLs Studio uses for previews so its
      // image component renders instantly when the patch lands.
      await Promise.allSettled([
        fetch(`${asset.url}?w=200&h=300&fit=crop`, {
          method: "HEAD",
          cache: "no-store",
        }),
        fetch(`${asset.url}?w=400&h=600&fit=crop`, {
          method: "HEAD",
          cache: "no-store",
        }),
      ]);
      return asset._id;
    }

    // Verification failed — delete the broken asset and retry the upload
    try {
      await client.delete(asset._id);
    } catch (e) {
      console.warn("Couldn't delete broken asset:", e);
    }
    console.warn(
      `Cover upload attempt ${attempt} produced a broken asset; retrying…`,
    );
  }

  throw new Error(
    "Sanity didn't serve the uploaded cover after 3 attempts. The upload may have been truncated — try again.",
  );
}

// Back-compat alias for callers still importing the old name.
export { uploadAndVerify as uploadAndWaitForReady };
