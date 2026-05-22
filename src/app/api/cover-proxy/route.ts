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

async function handle(req: Request, headOnly: boolean) {
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

  const res = await fetch(target.toString(), {
    method: headOnly ? "HEAD" : "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    return new Response(headOnly ? null : `upstream ${res.status}`, {
      status: res.status,
    });
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    return new Response(headOnly ? null : "non-image content", {
      status: 415,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response(headOnly ? null : res.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function GET(req: Request) {
  return handle(req, false);
}

export async function HEAD(req: Request) {
  return handle(req, true);
}
