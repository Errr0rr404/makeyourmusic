// Android Digital Asset Links file. The intent-filter in mobile/app.json
// declares `autoVerify: true` for /track/*, /agent/*, /genre/*, /playlist/*;
// this file is what Android verifies against to grant the app the right to
// claim those URLs without disambiguation prompts.
//
// To compute SHA256_CERT_FINGERPRINT, run on the signed APK:
//   keytool -list -v -keystore <keystore.jks> -alias <alias>
// then paste the hex bytes (uppercase, colon-separated) into the env var.

import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  const packageName = process.env.ANDROID_PACKAGE_NAME || 'com.makeyourmusic.app';
  const fingerprint = process.env.ANDROID_SHA256_FINGERPRINT || '';

  // If no fingerprint is configured, return an empty array — App Links
  // verification will silently fail (no link auto-handling), but the file
  // is still well-formed so Google's verifier doesn't error.
  const fingerprints = fingerprint
    ? fingerprint.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const body = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
