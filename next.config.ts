import type { NextConfig } from "next";

const securityHeaders = [
  // Clickjacking / framing defense.
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Less referer data leaves the browser.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browsers' old document-mode switching.
  { key: "X-Download-Options", value: "noopen" },
  // Keep permissions off by default (no camera/mic/geolocation use here).
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Inline scripts/styles are required by Next's RSC hydration payload; every
  // other resource is same-origin only. 'unsafe-inline' trades some XSS
  // hardening for a working app — the bundle is still server-rendered and all
  // user content is React-escaped. A nonce-based strict CSP is a future
  // upgrade for teams with a security review budget.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
