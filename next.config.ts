import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Only apply these configurations for client-side builds
    if (!isServer) {
      // Ignore server-only modules for client builds
      config.externals = config.externals || [];
      config.externals.push({
        'ssh2': 'ssh2',
        'node-ssh': 'node-ssh',
        '@/lib/geminiService': '@/lib/geminiService',
        '@/lib/gcpVmService': '@/lib/gcpVmService',
      });

      // Add fallbacks for Node.js modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        util: false,
        child_process: false,
      };
    }

    // Handle .node files (native binaries) - ignore them during bundling
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader',
    });

    // Exclude specific modules that contain native dependencies
    config.module.rules.push({
      test: /node_modules\/(ssh2|node-ssh)/,
      use: 'ignore-loader',
    });

    // Exclude temp directory from compilation
    config.module.rules.push({
      test: /temp\/.*\.(ts|tsx|js|jsx)$/,
      use: 'ignore-loader',
    });

    return config;
  },
  // Mark packages as external for server components
  serverExternalPackages: ['ssh2', 'node-ssh'],
  // Exclude temp directory from page compilation
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
};

export default nextConfig;
