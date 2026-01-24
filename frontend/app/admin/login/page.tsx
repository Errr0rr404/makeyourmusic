'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy admin login page - redirects to unified /manage login
 * This page exists for backward compatibility with old links/bookmarks
 */
export default function AdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to unified management login
    router.replace('/manage');
  }, [router]);

  return null;
}
