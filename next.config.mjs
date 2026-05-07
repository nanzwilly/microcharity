/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow live cause images from the existing WordPress site until media is migrated.
    remotePatterns: [
      { protocol: "https", hostname: "www.microcharity.com" },
      { protocol: "https", hostname: "microcharity.com" },
    ],
  },
};

export default nextConfig;
