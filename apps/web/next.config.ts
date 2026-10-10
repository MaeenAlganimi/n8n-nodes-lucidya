import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@barq/core', '@barq/db'],
  serverExternalPackages: ['@electric-sql/pglite', 'pg'],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
