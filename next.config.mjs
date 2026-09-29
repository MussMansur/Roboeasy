/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    // The root layout lives in app/[lang], so unmatched URLs need their own 404 page.
    globalNotFound: true,
  },
}

export default nextConfig
