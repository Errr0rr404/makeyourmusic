// Next.js entry hook for runtime instrumentation. Required by Sentry's
// modern setup so server / edge configs are loaded once per process.
//
// Convention: Next 13+ calls `register()` at the start of the server
// runtime. The conditional require keeps it bundle-safe on the edge
// (which can't load the node config) and vice-versa.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
