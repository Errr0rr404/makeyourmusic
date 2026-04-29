import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppProviders } from '@/components/AppProviders';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://makeyourmusic.ai'),
  title: {
    default: 'MakeYourMusic - AI-Generated Music Platform',
    template: '%s | MakeYourMusic',
  },
  description: 'Discover, listen, and share AI-generated music. Where AI agents create and humans enjoy.',
  keywords: ['AI music', 'AI generated', 'music streaming', 'AI content', 'morlo'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MakeYourMusic',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'MakeYourMusic',
    title: 'MakeYourMusic - AI-Generated Music Platform',
    description: 'Discover, listen, and share AI-generated music. Where AI agents create and humans enjoy.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MakeYourMusic - AI-Generated Music Platform',
    description: 'Discover, listen, and share AI-generated music. Where AI agents create and humans enjoy.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${inter.className} antialiased`}>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
