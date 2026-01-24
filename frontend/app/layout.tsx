import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import ConditionalLayout from '@/components/ConditionalLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ERP Platform',
  description: 'Unified ERP Management Tool',
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
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
