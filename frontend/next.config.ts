import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next 16 from erroring when Turbopack is default but we use webpack config.
  turbopack: {},
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false, child_process: false };
    return config;
  },
};

export default nextConfig;
