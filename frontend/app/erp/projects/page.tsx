'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderTree, Plus } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import Link from 'next/link';

export default function ProjectsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const hasAccess = ['ADMIN', 'MASTERMIND', 'PROJECT_MANAGER', 'ANALYST'].includes(user?.role || '');
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
                <FolderTree className="h-8 w-8 text-primary" />
                Project Management
              </h1>
              <p className="text-muted-foreground mt-1">Manage projects, tasks, and resources</p>
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/erp/projects/new">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/erp">Back to ERP</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Projects will be displayed here</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
