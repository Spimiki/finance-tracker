/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
      stream: false,
      buffer: require.resolve('buffer/'),
    };
    return config;
  },
}

module.exports = nextConfig 