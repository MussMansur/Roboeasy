/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Old section URLs (docs/product/information-architecture.md). Locale-less ones get a locale from proxy.ts first.
  redirects() {
    return [
      { source: '/:lang(ru|kk|en)/workspace', destination: '/:lang/sandbox', permanent: true },
      { source: '/:lang(ru|kk|en)/fll/:rest*', destination: '/:lang/compete/:rest*', permanent: true },
      // Classes were removed (self-paced learning only): old links land on the learner's path.
      { source: '/:lang(ru|kk|en)/class/:rest*', destination: '/:lang/path', permanent: false },
      { source: '/workspace', destination: '/sandbox', permanent: true },
      { source: '/fll/:rest*', destination: '/compete/:rest*', permanent: true },
    ]
  },
  experimental: {
    // The root layout lives in app/[lang], so unmatched URLs need their own 404 page.
    globalNotFound: true,
  },
}

export default nextConfig
