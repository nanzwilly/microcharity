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
};

export default nextConfig;
