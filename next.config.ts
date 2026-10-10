import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Kid pages are prerendered to static HTML at build time; only /api/admin runs on the server.
  // Our images are small SVGs or pre-sized pictures; no image server needed.
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  // The route handlers set no-store themselves; this also covers replies Next.js makes (405s), and
  // the deploy status the admin dashboard polls.
  async headers() {
    const noStore = [{ key: "Cache-Control", value: "no-store" }];
    return [
      { source: "/api/admin/:path*", headers: noStore },
      { source: "/build-info.json", headers: noStore },
    ];
  },
};

export default nextConfig;
