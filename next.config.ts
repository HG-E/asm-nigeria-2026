import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Detects dropped connectivity (common on slow/intermittent mobile
    // networks) and auto-retries navigations, prefetches, and Server
    // Actions once the connection returns, instead of surfacing a hard
    // error. See components/offline-banner.tsx for the user-facing side.
    useOffline: true,
    serverActions: {
      // Next's own default is 1MB for the WHOLE request body. Every other
      // upload in this app goes client-direct-to-Supabase-Storage and never
      // touches a Server Action body at all, but conference registration
      // has no logged-in session to scope a direct storage upload to, so it
      // has to send the receipt + photo (+ optional membership certificate)
      // as real File data straight through submitRegistrationAction's
      // FormData. Two ~1MB files alone already clear the 1MB default, so
      // Next was silently rejecting the request before the action's own
      // per-file validation (or its actually-helpful error messages) ever
      // ran -- this is what real users were hitting as "the button doesn't
      // work." 12mb comfortably covers 3 files at the 1MB-each cap
      // (app/register-conference/actions.ts, tied to the Storage bucket's
      // own file_size_limit) plus multipart overhead.
      bodySizeLimit: "12mb",
    },
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
