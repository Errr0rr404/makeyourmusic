'use client';

// Import the API module to trigger createApi() on module load.
// This ensures the shared API singleton is initialized before
// any store (auth, player, etc.) calls getApi().
import '@/lib/api';

import { useEffect } from 'react';
import { Toaster as SonnerToaster } from 'sonner';
import { ThemeProvider } from './ThemeProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { ToastContainer } from './Toast';
import { ConfirmProvider } from './ui/ConfirmDialog';
import { useAuthStore } from '@/lib/store/authStore';
import { usePlayerStore } from '@/lib/store/playerStore';

function AuthHydrator({ children }: { children: React.ReactNode }) {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const hydratePlayerPrefs = usePlayerStore((s) => s.hydratePrefs);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // Hydrate auth state and player prefs from storage on mount.
      // For auth: instantly sets isAuthenticated=true if a token exists,
      // then fetchUser reconciles the full profile through the refresh flow.
      // For player: restores volume, EQ, etc. from the last session.
      await Promise.all([hydrateAuth(), hydratePlayerPrefs()]);
      if (!cancelled) {
        await fetchUser();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrateAuth, fetchUser, hydratePlayerPrefs]);

  return <>{children}</>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="makeyourmusic-theme">
        <AuthHydrator>
          <ConfirmProvider>
            {children}
            <ToastContainer />
            <SonnerToaster
              theme="dark"
              position="top-right"
              toastOptions={{
                style: { background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' },
              }}
            />
          </ConfirmProvider>
        </AuthHydrator>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
