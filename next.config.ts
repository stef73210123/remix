import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
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
