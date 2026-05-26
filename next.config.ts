import type { NextConfig } from "next";

const studioUrl =
  process.env.NEXT_PUBLIC_SANITY_STUDIO_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3333"
    : "https://studio.markurquhart.com");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/studio",
        destination: studioUrl,
        permanent: true,
      },
      {
        source: "/studio/:path*",
        destination: `${studioUrl}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
