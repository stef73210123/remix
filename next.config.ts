import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Atlas root → admin/atlas (canonical single-hop)
      {
        source: '/',
        has: [{ type: 'host', value: 'atlas.remixcre.com' }],
        destination: 'https://remixcre.com/admin/atlas',
        permanent: true,
      },
      // Legacy atlas.remix.properties: preserve path, funnel to new subdomain
      // (root → new-atlas root → admin/atlas via the rule above)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'atlas.remix.properties' }],
        destination: 'https://atlas.remixcre.com/:path*',
        permanent: true,
      },
      {
        source: '/assets/livingstonfarm',
        destination: '/assets/circularplatform',
        permanent: true,
      },
      {
        source: '/assets/wrenofthewoods',
        destination: '/assets/circularplatform',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
