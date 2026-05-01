import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { AppProviders } from '@/components/AppProviders';
import type { Skin, Palette } from '@/components/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://makeyourmusic.ai'),
  title: {
    default: 'MakeYourMusic - AI-Generated Music Platform',
    template: '%s | MakeYourMusic',
  },
  description: 'Discover, listen, and share AI-generated music. Where AI agents create and humans enjoy.',
  keywords: ['AI music', 'AI generated', 'music streaming', 'AI content', 'makeyourmusic'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MakeYourMusic',
  },
  icons: {
    icon: [
      { url: '/logo-mark.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/favicon.ico',
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  const skinCookie = store.get('mym-skin')?.value;
  const paletteCookie = store.get('mym-palette')?.value;
  const skin: Skin = skinCookie === 'vintage' ? 'vintage' : 'modern';
  const palette: Palette =
    paletteCookie === 'dark' || paletteCookie === 'light' || paletteCookie === 'system'
      ? paletteCookie
      : 'system';

  // Server-resolved palette class — `system` collapses on the client once it
  // can read prefers-color-scheme. We default to `dark` for SSR to match the
  // app's previous default and avoid a heavy FOUC.
  const ssrPaletteClass = palette === 'light' ? 'light' : 'dark';
  const skinClass = skin === 'vintage' ? 'skin-vintage' : 'skin-modern';

  return (
    <html
      lang="en"
      className={`${skinClass} ${ssrPaletteClass}`}
      data-skin={skin}
      data-palette={ssrPaletteClass}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        {/*
          Pre-paint theme sync. The cookie path covers most users, but if a
          user changed their theme on a different device (or cookies are
          disabled) we'd flash the cookie/SSR default for one frame before
          the React effect hydrates. This blocking <script> reads
          localStorage and applies the right classes BEFORE first paint.
          Inline so it executes synchronously; trust it because it only
          reads our own keys and toggles classes.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              var s=localStorage.getItem('mym-skin');
              var p=localStorage.getItem('mym-palette')||localStorage.getItem('theme');
              var r=document.documentElement;
              if(s==='vintage'){r.classList.remove('skin-modern');r.classList.add('skin-vintage');r.dataset.skin='vintage';}
              else if(s==='modern'){r.classList.remove('skin-vintage');r.classList.add('skin-modern');r.dataset.skin='modern';}
              var resolved=p;
              if(p==='system'||!p){resolved=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
              if(resolved==='light'||resolved==='dark'){r.classList.remove('light','dark');r.classList.add(resolved);r.dataset.palette=resolved;}
            }catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <AppProviders initialSkin={skin} initialPalette={palette}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
