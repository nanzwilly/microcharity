/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Cause images now live on Vercel Blob — wildcard covers every blob store
      // attached to this project.
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Legacy WordPress fallbacks while any un-migrated images remain.
      { protocol: "https", hostname: "www.microcharity.com" },
      { protocol: "https", hostname: "microcharity.com" },
    ],
  },

  // Security headers applied to every response. CSP intentionally omitted for now —
  // Razorpay's checkout widget and Cloudflare Turnstile each pull scripts, frames,
  // and stylesheets from their own origins, so a non-trivial CSP requires per-route
  // allowlisting that's easy to get wrong. The headers below are the safe baseline.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Force HTTPS for a year on every visitor, including subdomains.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Block clickjacking via iframe embedding.
          { key: "X-Frame-Options", value: "DENY" },
          // Browser must respect server-declared content types — no MIME sniffing.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Send the origin on cross-origin nav, full URL on same-origin.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable browser features we don't use anywhere.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
