import type { NextConfig } from 'next'

const corsAllowedOrigin =
  process.env.NEXTAUTH_CORS_ALLOWED_ORIGINS?.split(/[,\s]+/).map((item) => item.trim()).filter(Boolean)[0] ??
  'https://stream.frvtubers.com'

const corsHeaders = [
  { key: 'Access-Control-Allow-Origin', value: corsAllowedOrigin },
  { key: 'Access-Control-Allow-Credentials', value: 'true' },
  { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
  { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With, Accept' },
]

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/auth/:path*',
        headers: corsHeaders,
      },
      {
        source: '/api/v1/auth/:path*',
        headers: corsHeaders,
      },
    ]
  },
}

export default nextConfig
