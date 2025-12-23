/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: false,
  },
  // Empty turbopack config to silence the warning
  // Turbopack handles server-side code differently, so discord.js won't be bundled on client
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Exclude Discord.js and its dependencies from client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'discord.js': false,
        '@discordjs/ws': false,
        'zlib-sync': false,
        'erlpack': false,
        'node_modules/@discordjs/ws': false,
      };
      
      // Also add to externals to prevent bundling
      config.externals = config.externals || [];
      config.externals.push({
        'discord.js': 'discord.js',
        '@discordjs/ws': '@discordjs/ws',
        'zlib-sync': 'zlib-sync',
        'erlpack': 'erlpack'
      });
    }
    return config;
  },
};

module.exports = nextConfig;