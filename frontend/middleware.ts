import { NextResponse, type NextRequest } from 'next/server';

// Pages that should bounce unauthenticated users to /login.
// Coarse-grained gating only — fine-grained role checks (e.g. ADMIN) still
// happen client-side and at the API layer. The signal here is the presence
// of the httpOnly `refreshToken` cookie set by the backend on login.
//
// `/create` is intentionally NOT protected — anonymous users can browse the
// idea/style/lyrics steps; the auth wall fires inside the page right before
// the actual /ai/music call (see frontend/app/(main)/create/page.tsx).
const PROTECTED_PREFIXES = [
  '/admin',
  '/dashboard',
  '/studio',
  '/notifications',
];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (!isProtected) return NextResponse.next();

  const hasRefreshCookie = req.cookies.has('refreshToken');
  if (hasRefreshCookie) return NextResponse.next();

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on every path except static assets, Next internals, and /api proxies.
  // The dot rule was previously `.*\.` which excluded any path containing a
  // `.` ANYWHERE, so user-controlled segments with a dot (e.g. /agent/foo.bar)
  // skipped auth gating entirely. Tighten to "extension at end of path" only.
  matcher: ['/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.[a-zA-Z0-9]+$).*)'],
};
