/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.stlouisfed.org' },
      { protocol: 'https', hostname: 'fred.stlouisfed.org' },
      { protocol: 'https', hostname: 'images.unsplash.com' }
    ]
  }
};

export default nextConfig;
