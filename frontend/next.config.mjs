import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: workspaceRoot,
  // Optimize for production
  compress: true,
  poweredByHeader: false, // Remove X-Powered-By header for security
  // Enable React strict mode
  reactStrictMode: true,

  // Proxy /api requests to the backend so the browser sees a single origin.
  // This is required on Railway (frontend and api are on different *.up.railway.app
  // subdomains, which the Public Suffix List treats as separate sites — so a
  // cross-site Set-Cookie from the api would be dropped, and middleware on the
  // frontend domain could never read the refreshToken cookie).
  async rewrites() {
    const backendUrl = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
        ],
      },
    ];
  },

  // Image configuration with optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      // Allow all HTTPS images (for flexibility)
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Latest experimental features for Next.js 15
  experimental: {
    // Enable React Compiler (experimental)
    // reactCompiler: true,
    // Enable PPR (Partial Pre-Rendering) when ready
    // ppr: true,
  },
};

export default nextConfig;
