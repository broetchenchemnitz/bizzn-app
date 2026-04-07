/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['bizzn.de', 'www.bizzn.de', 'app.bizzn.de', 'nhzemmfijrzbulywrnkw.supabase.co'],
  },
  allowedDevOrigins: ['*.localhost'],
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ]
  },
}
module.exports = nextConfig
