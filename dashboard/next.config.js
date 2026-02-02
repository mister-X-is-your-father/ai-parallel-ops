/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
  // task-master-ai uses native modules — keep it server-side only
  serverExternalPackages: ["task-master-ai"],
};

module.exports = nextConfig;
