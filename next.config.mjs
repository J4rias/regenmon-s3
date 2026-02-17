/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    resolveAlias: {
      'thread-stream': './lib/noop.js',
      'sonic-boom': './lib/noop.js',
      'pino-pretty': './lib/noop.js',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://auth.privy.io",
          },
        ],
      },
    ]
  },
}

export default nextConfig
