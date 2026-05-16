/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep Three.js ecosystem out of the server bundle — loaded client-only via dynamic()
  serverExternalPackages: ["three", "@react-three/fiber", "@react-three/drei"],
};

export default nextConfig;
