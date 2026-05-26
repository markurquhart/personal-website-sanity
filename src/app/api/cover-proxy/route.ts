// Same-origin proxy for book cover images. The Studio needs to fetch()
// these bytes to upload them as Sanity assets — Google's image CDN doesn't
// send CORS headers, so a direct fetch is blocked (an `<img src=…>` would
// render fine but we can't read the bytes from it). Open Library's covers
// endpoint does set CORS headers, but we still route through the proxy for
// consistency and to keep the host allowlist in one place.

import { NextResponse } from "next/server";

export const runtime = "edge";

const ALLOWED_HOSTS = new Set([
  "books.google.com",
  "books.googleusercontent.com",
  "covers.openlibrary.org",
]);

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  if (!origin) return {};

  try {
    const { hostname, protocol } = new URL(origin);
    const isStudioHost =
      protocol === "https:" &&
      (hostname === "studio.markurquhart.com" ||
        (hostname.endsWith(".vercel.app") &&
          hostname.includes("personal-website-studio")));
    const isLocalStudio =
      protocol === "http:" &&
      (hostname === "localhost" || hostname === "127.0.0.1");

    if (!isStudioHost && !isLocalStudio) return {};

    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
      Vary: "Origin",
    };
  } catch {
    return {};
  }
}

async function handle(req: Request, headOnly: boolean) {
  const corsHeaders = getCorsHeaders(req);
  const url = new URL(req.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json(
      { error: "missing url" },
      { status: 400, headers: corsHeaders },
    );
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return NextResponse.json(
      { error: "invalid url" },
      { status: 400, headers: corsHeaders },
    );
  }

  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json(
      { error: `host '${target.hostname}' not allowed` },
      { status: 403, headers: corsHeaders },
    );
  }

  const res = await fetch(target.toString(), {
    method: headOnly ? "HEAD" : "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    return new Response(headOnly ? null : `upstream ${res.status}`, {
      status: res.status,
      headers: corsHeaders,
    });
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    return new Response(headOnly ? null : "non-image upstream", {
      status: 415,
      headers: {
        "Content-Type": "text/plain",
        ...corsHeaders,
      },
    });
  }

  return new Response(headOnly ? null : res.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
      ...corsHeaders,
    },
  });
}

export async function GET(req: Request) {
  return handle(req, false);
}

export async function HEAD(req: Request) {
  return handle(req, true);
}

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}
