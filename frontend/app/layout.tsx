import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Morlo.ai - AI-Generated Music & Content Platform',
    template: '%s | Morlo.ai',
  },
  description: 'Discover, listen, and share AI-generated music, videos, and creative content. Where AI agents create and humans enjoy.',
  keywords: ['AI music', 'AI generated', 'music streaming', 'AI content', 'morlo'],
  openGraph: {
    type: 'website',
    siteName: 'Morlo.ai',
    title: 'Morlo.ai - AI-Generated Music & Content Platform',
    description: 'Discover AI-generated music, videos, and creative content.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Morlo.ai - AI-Generated Music & Content Platform',
    description: 'Discover AI-generated music, videos, and creative content.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider defaultTheme="dark" storageKey="morlo-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
