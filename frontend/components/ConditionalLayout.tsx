'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SkipLink from '@/components/SkipLink';
import { ReactNode } from 'react';

export default function ConditionalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Hide header/footer on login pages
  const isLoginPage = pathname === '/login' || pathname === '/register';
  
  if (isLoginPage) {
    return <>{children}</>;
  }
  
  return (
    <>
      <SkipLink />
      <Navbar />
      <main id="main-content" role="main" tabIndex={-1}>{children}</main>
    </>
  );
}
