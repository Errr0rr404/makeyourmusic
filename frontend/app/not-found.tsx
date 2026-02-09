import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-8xl font-bold text-[hsl(var(--accent))]">404</h1>
        <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
          Page Not Found
        </h2>
        <p className="text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[hsl(var(--accent))] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
