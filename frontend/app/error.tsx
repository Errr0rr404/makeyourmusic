'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-6xl font-bold text-red-500">Oops</h1>
        <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
          Something went wrong
        </h2>
        <p className="text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[hsl(var(--accent))] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
