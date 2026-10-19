import { straps } from './src/data/catalog.js';

/** @type {import('next).NextConfig} */
const nextConfig = {
  // Runs as a Node server (`next start`); static export (`output: 'export'`) removed.
  basePath: process.env.BASE_PATH || '',
  assetPrefix: process.env.BASE_PATH || '',
  trailingSlash: true,

  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  transpilePackages: ['gsap'],

  // Permanent (308) redirects for old addresses. Built from the catalog so only
  // the six real straps redirect; unknown /straps/ paths stay 404.
  async redirects() {
    return [
      ...straps.map((strap) => ({
        source: `/straps/${strap.slug}/`,
        destination: `/our-shop/${strap.slug}/`,
        permanent: true,
      })),
      { source: '/product-details/', destination: '/our-shop/sunseeker-yellow/', permanent: true },
    ];
  },
};

export default nextConfig;