// Sentry init for the React Native app. The package install failed during
// the initial Phase 1 sweep (a pre-existing nativewind dep collision —
// independent of Sentry), so this module is a no-op shim that lazily
// loads `@sentry/react-native` if it gets added to package.json later.
//
// Once installed, init fires automatically when SENTRY_DSN_MOBILE is set
// in the runtime config (or hardcoded into the env file used by EAS).

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN_MOBILE;
  if (!dsn) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native');
    Sentry.init({
      dsn,
      tracesSampleRate: parseFloat(process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0'),
      enableAutoSessionTracking: true,
    });
    initialized = true;
  } catch {
    // Package not installed yet — silently skip. Real install: see
    // https://docs.sentry.io/platforms/react-native/.
  }
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native');
    Sentry.captureException(err, context ? { extra: context } : undefined);
  } catch {
    /* swallow — never break user-visible flows on a Sentry hiccup */
  }
}
