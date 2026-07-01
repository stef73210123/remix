import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        has: [{ type: 'host', value: 'atlas.remix.properties' }],
        destination: 'https://remix.properties/admin/atlas',
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
