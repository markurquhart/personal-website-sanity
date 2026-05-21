// Whitelisted image proxy. Lets the Sanity Studio book editor fetch public
// book covers without browser CORS issues. No secrets, just bypassing CORS
// for image hosts we already display elsewhere on the site.

import { NextResponse } from "next/server";

export const runtime = "edge";

const ALLOWED_HOSTS = new Set([
  "books.google.com",
  "books.googleusercontent.com",
  "covers.openlibrary.org",
]);

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json(
      { error: `host '${target.hostname}' not allowed` },
      { status: 403 },
    );
  }

  const res = await fetch(target.toString(), { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { error: `upstream ${res.status}` },
      { status: res.status },
    );
  }

  // Reject non-image upstream responses so we never upload an HTML error
  // page (or anything weird) into Sanity as an image asset.
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json(
      { error: `upstream returned non-image content (${contentType})` },
      { status: 415 },
    );
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
