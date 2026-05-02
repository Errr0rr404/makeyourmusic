// Apple Universal Links + App Clip association file. Apple fetches this
// over HTTPS at /.well-known/apple-app-site-association — it MUST be served
// with `Content-Type: application/json` and MUST NOT redirect.
//
// `applinks` declares which paths open in the parent app when installed;
// `appclips` declares which paths can launch the App Clip when the parent
// app is NOT installed.
//
// The TEAM_ID and bundle ids below should be set via env so the same code
// works for staging + prod. APPLE_TEAM_ID is the 10-char team identifier
// from the Apple Developer portal.

import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID || 'YOURTEAMID';
  const parentBundleId = process.env.IOS_BUNDLE_ID || 'com.worldofz.makeyourmusic';
  const clipBundleId = process.env.IOS_APPCLIP_BUNDLE_ID || 'com.worldofz.makeyourmusic.Clip';

  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appID: `${teamId}.${parentBundleId}`,
          paths: [
            '/track/*',
            '/agent/*',
            '/genre/*',
            '/playlist/*',
            '/party/*',
          ],
        },
      ],
    },
    appclips: {
      apps: [`${teamId}.${clipBundleId}`],
    },
  };

  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
