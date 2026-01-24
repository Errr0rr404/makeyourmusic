'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { hasERPAccess } from '@/lib/erp/permissions';
import AuditLogViewer from '@/components/erp/AuditLogViewer';

export default function AuditPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Only ADMIN and MASTERMIND can access audit logs
    const hasAccess = ['ADMIN', 'MASTERMIND'].includes(user?.role || '');
    if (!hasAccess) {
      router.push('/erp');
      return;
    }
  }, [isAuthenticated, user, router]);

  if (!user || !['ADMIN', 'MASTERMIND'].includes(user.role)) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Audit Log
          </h1>
          <p className="text-muted-foreground mt-1">
            Track all system activities for compliance and security
          </p>
        </div>
      </div>

      {/* Audit Log Viewer */}
      <AuditLogViewer showStats={true} />
    </div>
  );
}
