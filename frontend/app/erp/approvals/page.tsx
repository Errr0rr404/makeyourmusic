'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { hasERPAccess } from '@/lib/erp/permissions';
import ApprovalCenter from '@/components/erp/ApprovalCenter';

export default function ApprovalsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!user?.role || !hasERPAccess(user.role)) {
      router.push('/');
      return;
    }
  }, [isAuthenticated, user, router]);

  if (!user || !hasERPAccess(user.role)) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CheckSquare className="h-8 w-8 text-primary" />
            Approval Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and manage approval requests
          </p>
        </div>
      </div>

      {/* Approval Center */}
      <ApprovalCenter
        userId={user.id}
      />
    </div>
  );
}
