/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['bizzn.de', 'www.bizzn.de', 'app.bizzn.de', 'nhzemmfijrzbulywrnkw.supabase.co'],
  },
  allowedDevOrigins: ['*.localhost'],
}
module.exports = nextConfig
