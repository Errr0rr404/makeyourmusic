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
    const backendUrl = (process.env.INTERNAL_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
    const backendOrigin = backendUrl.replace(/\/api$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
      {
        source: '/embed/:path*',
        destination: `${backendOrigin}/embed/:path*`,
      },
    ];
  },

  // Security headers
  async headers() {
    // Baseline CSP. `'unsafe-inline'` for styles is needed by Tailwind's
    // generated atomics + motion's runtime-injected styles. Scripts are kept
    // tight: `'self'` plus the Firebase + Stripe entry points used by sign-in
    // and checkout. `connect-src` lists the API origins the SPA actually talks
    // to; `frame-src` is just the Stripe checkout iframe.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: data: https:",
      "font-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // unsafe-eval is unfortunate but Next.js + some libs (motion, recharts)
      // rely on Function() in production builds. unsafe-inline covers small
      // bootstrap snippets injected by Next.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.stripe.com https://js.stripe.com https://*.firebaseio.com https://*.googleapis.com https://apis.google.com",
      "connect-src 'self' https://*.stripe.com https://api.stripe.com https://*.firebaseio.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.up.railway.app https://res.cloudinary.com https://*.cloudinary.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://*.firebaseapp.com",
      'upgrade-insecure-requests',
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
      // Public OG-image route is dynamic but heavily cached — surrogate caches
      // (Cloudflare, Vercel) get a 1-day TTL with stale-while-revalidate so a
      // viral share doesn't rebuild it on every fetch. Build outputs under
      // _next/static/ already use immutable headers from Next.js itself.
      {
        source: '/track/:slug/opengraph-image',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800' },
        ],
      },
      // Embed routes are linked from third-party sites (Notion, blogs); cache
      // aggressively at the edge to keep that fast for everyone.
      {
        source: '/embed/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
    ];
  },

  // Image configuration with optimization. Hostnames are explicitly listed
  // — the previous `**` allowed Next's image proxy to be pointed at any HTTPS
  // host, which is both an SSRF vector (the proxy fetches server-side) and a
  // free image-CDN for arbitrary third parties.
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.cloudinary.com', pathname: '/**' },
      // Firebase Auth profile photos (Google sign-in surfaces these).
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/**' },
      // Track cover-art originals can come back from MiniMax/Aliyun before
      // they're rehosted on Cloudinary.
      { protocol: 'https', hostname: '*.aliyuncs.com', pathname: '/**' },
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
