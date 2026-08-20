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
    const SUPABASE_ORIGIN = "https://ykkgzqeicyqfglvnzrri.supabase.co"
    const csp = [
      "default-src 'self'",
      // React/Next hydration and our own inline <style={{}}> usage on the
      // landing page both need 'unsafe-inline' -- a nonce-based CSP would be
      // stricter but requires threading a nonce through proxy.ts and every
      // inline style on the marketing page, which is a larger follow-up.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: " + SUPABASE_ORIGIN,
      "font-src 'self' data:",
      "connect-src 'self' " + SUPABASE_ORIGIN,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ")

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
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
