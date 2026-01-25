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

export const themeColor = [
  { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
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
