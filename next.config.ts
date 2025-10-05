import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Enable src directory support
    appDir: true,
  },
};

export default nextConfig;
