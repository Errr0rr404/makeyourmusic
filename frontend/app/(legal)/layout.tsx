import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { BrandLogo } from '@/components/brand/BrandLogo';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <header className="border-b border-[hsl(var(--border))]">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <BrandLogo markClassName="h-8 w-8" textClassName="text-lg" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-16">
        <article className="legal-content">
          {children}
        </article>
      </main>
      <Footer />
    </div>
  );
}
