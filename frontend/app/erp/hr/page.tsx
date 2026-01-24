'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import Link from 'next/link';

export default function HRPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const hasAccess = ['ADMIN', 'MASTERMIND', 'HR_MANAGER'].includes(user?.role || '');
    if (!hasAccess) {
      router.push('/erp');
      return;
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Briefcase className="h-8 w-8 text-primary" />
                Human Resources
              </h1>
              <p className="text-muted-foreground mt-1">Manage employees, payroll, and performance</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/pos/employees">Manage Employees</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/pos/payroll">Payroll</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/erp">Back to ERP</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Employee Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Manage your team members</p>
              <Button asChild>
                <Link href="/pos/employees">View Employees</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payroll</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Process payroll and manage pay periods</p>
              <Button asChild>
                <Link href="/pos/payroll">View Payroll</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
