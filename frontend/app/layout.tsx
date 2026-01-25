import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import ConditionalLayout from '@/components/ConditionalLayout';
import { GlobalSearch } from '@/components/GlobalSearch';
import { SocketProvider } from '@/components/SocketProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Kairux - Business in Flow',
    template: '%s | Kairux',
  },
  description: 'Kairux - Modern AI-powered Cloud ERP system. Where business connects and flows seamlessly. Comprehensive management for CRM, accounting, inventory, HR, projects, and more.',
  keywords: ['Kairux', 'ERP', 'Enterprise Resource Planning', 'Cloud ERP', 'AI ERP', 'CRM', 'Accounting', 'Inventory Management', 'HR', 'Payroll', 'Business Management', 'Business Intelligence'],
  authors: [{ name: 'Kairux Team' }],
  creator: 'Kairux',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Kairux - Business in Flow',
    description: 'Modern AI-powered Cloud ERP system for seamless business management',
    siteName: 'Kairux',
    images: [
      {
        url: '/kairux-logo.svg',
        width: 800,
        height: 600,
        alt: 'Kairux - Business in Flow',
        type: 'image/svg+xml',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover' as const,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Kairux - Business in Flow</title>
        <link rel="icon" href="/kairux-icon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" type="image/x-icon" />
        <meta property="og:image" content="/kairux-logo.svg" />
        <meta property="og:image:type" content="image/svg+xml" />
        <meta property="og:image:alt" content="Kairux - Business in Flow" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="/kairux-logo.svg" />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <ThemeProvider>
            <SocketProvider>
              <GlobalSearch />
              <KeyboardShortcuts />
              <div className="min-h-screen bg-background">
                <ConditionalLayout>{children}</ConditionalLayout>
              </div>
              <Toaster
                position="top-right"
                containerStyle={{
                  top: '4rem', // Below navbar on mobile
                }}
                toastOptions={{
                  duration: 4000,
                  style: {
                    minWidth: '280px',
                    maxWidth: '90vw',
                  },
                }}
              />
            </SocketProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
