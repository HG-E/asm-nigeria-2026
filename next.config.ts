import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Detects dropped connectivity (common on slow/intermittent mobile
    // networks) and auto-retries navigations, prefetches, and Server
    // Actions once the connection returns, instead of surfacing a hard
    // error. See components/offline-banner.tsx for the user-facing side.
    useOffline: true,
  },
  async headers() {
    return [
      {
        // Never let the browser itself cache the service worker script --
        // it must always fetch the latest version so updates (or a rollback)
        // take effect on the next load instead of being stuck on stale code.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
