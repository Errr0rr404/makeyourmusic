'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import Link from 'next/link';

export default function InventoryPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
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
                <Package className="h-8 w-8 text-primary" />
                Inventory & Supply Chain
              </h1>
              <p className="text-muted-foreground mt-1">Manage inventory, suppliers, and procurement</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/pos/inventory">View Inventory</Link>
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
            <CardTitle>Supply Chain Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Inventory management is available through the POS system</p>
            <Button className="mt-4" asChild>
              <Link href="/pos/inventory">Go to Inventory</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
