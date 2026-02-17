/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['pino', 'thread-stream', 'sonic-boom', 'pino-pretty'],
}

export default nextConfig
