import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Kid pages are prerendered to static HTML at build time; only /api/admin runs on the server.
  // Our images are small SVGs or pre-sized pictures; no image server needed.
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
