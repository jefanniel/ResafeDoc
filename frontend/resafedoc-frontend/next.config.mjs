/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Signed URL Supabase Storage berasal dari subdomain project (*.supabase.co).
    // Ganti/perluas sesuai domain project Supabase kamu bila perlu.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
