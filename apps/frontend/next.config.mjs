/** @type {import('next').NextConfig} */
// GATEWAY_INTERNAL_URL: compose/k8s service DNS (e.g. http://api-gateway:4005);
// default localhost for local `next dev`.
const gateway = (process.env.GATEWAY_INTERNAL_URL || 'http://localhost:4005').replace(
  /\/$/,
  '',
);

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${gateway}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
