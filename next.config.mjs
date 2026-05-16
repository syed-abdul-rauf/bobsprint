/** @type {import('next').NextConfig} */
const nextConfig = {
  // Three.js needs to be transpiled
  transpilePackages: ["three"],
  webpack: (config) => {
    config.externals = config.externals || [];
    return config;
  },
};

export default nextConfig;
